// Server-authoritative game engine. Answers, facts, and scoring never leave this side.
// Storage: Cloudflare R2 (S3-compatible) — one object per player profile. R2 has zero
// egress fees, so heavy read traffic (leaderboard, audio) can't trip a bandwidth suspension.
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { COMPOSERS, matchGuess, norm, dayNumber } = require('./_game.js');
const { PIECES } = require('./_pieces.js');
const ASSETS = require('./_assets.json');

// Opaque audio host (decoupled from the profile-read base below). Unset → hotlink the
// public-domain source URLs directly, which keeps audio working with zero Blob bandwidth.
const AUDIO_HOST = process.env.AUDIO_HOST || '';

const MAX = 6;
const MULT = { easy: 1, medium: 2, hard: 3 };
const TIERS = ['easy', 'medium', 'hard'];

// ---------- storage (Cloudflare R2 / S3) ----------
// Namespaced under a prefix so Composerdle can share a bucket with other projects.
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PREFIX = 'cdle/';
const R2 = process.env.R2_S3_ENDPOINT ? new S3Client({
  region: 'auto',
  endpoint: process.env.R2_S3_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
}) : null;
const streamToString = async body => {
  if (typeof body.transformToString === 'function') return body.transformToString();
  const chunks = []; for await (const c of body) chunks.push(c); return Buffer.concat(chunks).toString('utf8');
};
async function readJSON(pathname) {
  // Missing key or any failure → "no data" (fresh player/game); never throw / 500 a request.
  if (!R2) return null;
  try {
    const r = await R2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + pathname }));
    return JSON.parse(await streamToString(r.Body));
  } catch (e) { return null; }
}
async function writeJSON(pathname, data) {
  // A write failure must not crash the guess response — the win still resolves; only
  // persistence (career/streak/leaderboard) is skipped.
  if (!R2) return false;
  try {
    await R2.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: R2_PREFIX + pathname,
      Body: JSON.stringify(data), ContentType: 'application/json',
    }));
    return true;
  } catch (e) { return false; }
}
// Leaderboard source: list every profile object, read them in parallel. Returns [] on failure.
async function loadAllProfiles(limit = 500) {
  if (!R2) return [];
  try {
    const keys = [];
    let ContinuationToken;
    do {
      const r = await R2.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET, Prefix: R2_PREFIX + 'u/', ContinuationToken, MaxKeys: 1000,
      }));
      for (const o of r.Contents || []) keys.push(o.Key.slice(R2_PREFIX.length));
      ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (ContinuationToken && keys.length < limit);
    const profs = await Promise.all(keys.slice(0, limit).map(k => readJSON(k)));
    return profs.filter(Boolean);
  } catch (e) { return []; }
}
const gameKey = (token, key) => `g/${token}/${key}.json`;
const profileKey = token => `u/${token}.json`;

const cleanToken = t => /^[a-z0-9-]{8,40}$/.test(String(t || '')) ? t : null;

// In-progress game state travels in an HMAC-signed token, not the Blob — this sidesteps
// Vercel Blob's read-after-write staleness (~60s min cache) that was losing updates and
// hanging games. The signature keeps it tamper-proof, so the server stays authoritative.
const crypto = require('crypto');
// Fail-closed: if the env secret is ever missing, use a random per-process one rather than a
// known constant. Tokens then can't be forged; they just won't validate across instances,
// which breaks visibly (prompting a fix) instead of silently accepting forged state.
const SECRET = process.env.CDLE_SECRET || crypto.randomBytes(32).toString('hex');
function signGame(key, g) {
  const body = Buffer.from(JSON.stringify({ k: key, g })).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + mac;
}
function readGame(gs) {
  if (typeof gs !== 'string') return null;
  const i = gs.lastIndexOf('.');
  if (i < 1) return null;
  const body = gs.slice(0, i), mac = gs.slice(i + 1);
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const o = JSON.parse(Buffer.from(body, 'base64url').toString()); return { key: o.k, g: o.g }; }
  catch (e) { return null; }
}

// ---------- puzzles ----------
function utcDay(d = new Date()) {
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(2026, 0, 1)) / 86400000);
}
function pieceForDay(tier, day) {
  const pool = PIECES[tier];
  const n = pool.length;
  const stride = [7, 5, 3, 2].find(s => n % s !== 0) || 1;
  return pool[((day * stride + 3) % n + n) % n];
}
function composerForDay(day) {
  const n = COMPOSERS.length;
  return COMPOSERS[((day * 17 + 11) % n + n) % n];
}
const pieceById = id => Object.values(PIECES).flat().find(p => ASSETS[p.title] && ASSETS[p.title].id === id);
const assets = p => ASSETS[p.title];

// Resolve which puzzle a game key refers to, re-deriving the answer server-side.
//   "<day>-<mode>[-<tier>]" daily · "e-<mode>-<nonce>" encore · "c-<pieceId>" challenge
function keyHash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function puzzleFor(key, g) {
  if (key.startsWith('c-')) { const piece = pieceById(key.slice(2)); return piece ? { mode: 'ear', tier: 'easy', piece } : null; }
  if (key.startsWith('e-')) {
    const [, mode, nonce] = key.split('-');
    if (!nonce) return null;
    if (mode === 'ear') { const pool = PIECES[g.tier || 'easy']; return { mode: 'ear', tier: g.tier || 'easy', piece: pool[keyHash(nonce) % pool.length] }; }
    return { mode: 'facts', composer: COMPOSERS[keyHash(nonce) % COMPOSERS.length] };
  }
  const m = key.match(/^(\d+)-(ear|facts)(?:-(easy|medium|hard))?$/);
  if (!m) return null;
  const day = +m[1];
  if (m[2] === 'ear') return { mode: 'ear', tier: m[3], piece: pieceForDay(m[3], day), day };
  return { mode: 'facts', composer: composerForDay(day), day };
}
// Rebuild a finished game record from a stored daily-completion result (for the once-a-day lock).
function gameFromResult(rec, tier) {
  const R = typeof rec === 'number' ? { pts: rec, marks: [], won: rec > 0, pieceFound: false } : rec;
  return { mode: 'ear', scored: true, tier, marks: R.marks || [], clues: 1, hints: 0, hintTexts: [], pieceFound: !!R.pieceFound, wrong: [], done: true, won: !!R.won, pts: R.pts || 0 };
}

// per-game clue hand: 6 of the 9 facts, seeded by the game key, in cryptic→giveaway
// order. facts9 runs 0 (most obscure) → 8 (biggest giveaway, names famous works).
// Difficulty picks which slice of that range the clues are drawn from:
//   easy   → recognizable / common-knowledge facts, finale names the works
//   medium → the full spread (default)
//   hard   → only the niche facts; the giveaways (7,8) are never shown
const FACT_WINDOW = {
  easy: { pool: [2, 3, 4, 5, 6, 7, 8], finale: [7, 8] },
  medium: { pool: [0, 1, 2, 3, 4, 5, 6, 7, 8], finale: [7, 8] },
  hard: { pool: [0, 1, 2, 3, 4, 5, 6], finale: [5, 6] },
};
function factIndices(key, tier) {
  const w = FACT_WINDOW[tier] || FACT_WINDOW.medium;
  let h = 2166136261;
  for (const ch of key) h = (h ^ ch.charCodeAt(0)) * 16777619 >>> 0;
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const finale = w.finale[Math.floor(rnd() * w.finale.length)];
  const pool = w.pool.filter(i => i !== finale);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return [...pool.slice(0, 5).sort((a, b) => a - b), finale];
}
const factsFor = (composer, key, count, tier) => factIndices(key, tier).slice(0, count).map(i => composer.facts9[i]);

// piece-name normalization (mirrors old client logic)
const normP = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]/g, '').replace(/no(?=\d)/g, '');

// ---------- game records ----------
function newGame(mode, scored) {
  return { mode, scored, marks: [], clues: 1, hints: 0, pieceFound: false, wrong: [], done: false, won: false, pts: 0 };
}

function earView(piece, g) {
  const a = assets(piece);
  const v = {
    puzzle: {
      audio: AUDIO_HOST ? `${AUDIO_HOST}/a/${a.id}.mp3` : piece.audio,
      pages: a.pages, crop: piece.crop || 0, cropBottom: piece.cropBottom || 0,
    },
    state: publicState(g),
  };
  if (g.comp && !g.done) v.state.composer = piece.composer; // piece hunt in progress — the composer is already earned
  if (g.done) v.state.result = earResult(piece, g);
  return v;
}
function factsView(composer, g, key) {
  const v = {
    puzzle: { clues: factsFor(composer, key, g.clues, g.tier) },
    state: publicState(g),
  };
  if (g.done) v.state.result = factsResult(composer, g);
  return v;
}
function publicState(g) {
  return { marks: g.marks, hints: g.hintTexts || [], pieceFound: g.pieceFound, wrong: g.wrong, done: g.done, won: g.won, comp: !!g.comp };
}
function earResult(piece, g) {
  const c = COMPOSERS.find(c => c.name === piece.composer);
  return {
    composer: piece.composer, years: c.years, title: piece.title,
    performer: piece.performer, license: piece.license, scoreNote: piece.scoreNote,
    pts: g.pts, pieceFound: g.pieceFound,
    // tries it took to name the composer — piece-hunt retries don't count against the verdict
    ctries: g.won ? MAX + 1 - (g.base || (MAX + 1 - g.marks.length)) : g.marks.length,
  };
}
function factsResult(composer, g) {
  return { composer: composer.name, years: composer.years, pts: g.pts };
}

// ---------- actions ----------
function applyEarAction(piece, g, tier, action, value) {
  if (g.done) return { error: 'game over' };
  const out = {};
  if (action === 'guess') {
    // composer already named — every further guess hunts the piece for the ×2, costing a try each
    if (g.comp) {
      const pv = String((value && value.p) || (typeof value === 'string' ? value : '')).slice(0, 80);
      const pn = normP(pv);
      if (pn.length < 3) return { error: 'too short' };
      if (piece.keys.some(k => pn.includes(k))) { g.pieceFound = true; out.piece = 'correct'; finishEar(piece, g, tier, true); }
      else {
        if (piece.genreWords.some(w => pn.includes(normP(w)))) { out.piece = 'genre'; out.genre = piece.genre; }
        else out.piece = 'wrong';
        g.marks.push('wrong');
        if (g.marks.length >= MAX) finishEar(piece, g, tier, true); // composer stands — win on single points
      }
      return out;
    }
    // combined guess: {c: composer, p: optional piece name} — both judged in the same try
    const cv = String((value && value.c) || (typeof value === 'string' ? value : '')).slice(0, 60);
    const pv = String((value && value.p) || '').slice(0, 80);
    if (!norm(cv)) return { error: 'empty guess' };
    if (pv && !g.pieceFound) {
      const pn = normP(pv);
      if (pn.length >= 3) {
        if (piece.keys.some(k => pn.includes(k))) { g.pieceFound = true; out.piece = 'correct'; }
        else if (piece.genreWords.some(w => pn.includes(normP(w)))) { out.piece = 'genre'; out.genre = piece.genre; }
        else out.piece = 'wrong';
      }
    }
    if (matchGuess(cv, COMPOSERS.find(c => c.name === piece.composer))) {
      g.marks.push('win');
      g.base = MAX + 1 - g.marks.length; // points locked at the composer-naming try
      if (g.pieceFound || g.marks.length >= MAX) finishEar(piece, g, tier, true);
      else { g.comp = true; out.composer = piece.composer; } // piece pending: retry with remaining tries, or bank
    } else {
      g.marks.push('wrong'); g.wrong.push(cv);
      const hit = COMPOSERS.find(c => matchGuess(cv, c));
      if (hit) out.strike = hit.name;
      if (g.marks.length >= MAX) finishEar(piece, g, tier, false);
    }
  } else if (action === 'bank') {
    // composer named, piece still open — take the single points and move on
    if (!g.comp) return { error: 'nothing to bank' };
    finishEar(piece, g, tier, true);
  } else if (action === 'hint') {
    if (g.hints >= 3 || g.marks.length >= MAX - 1) return { error: 'no hints left' };
    const c = COMPOSERS.find(c => c.name === piece.composer);
    const hints = [`Composed around ${piece.year}.`, `Its composer lived ${c.years}.`, `You are listening to a ${piece.genre}.`];
    g.hintTexts = g.hintTexts || [];
    g.hintTexts.push(hints[g.hints++]);
    g.marks.push('skip');
    out.hint = g.hintTexts[g.hintTexts.length - 1];
  } else if (action === 'quit') {
    if (g.comp) { finishEar(piece, g, tier, true); } // composer already named — quitting just banks
    else { g.marks.push('skip'); finishEar(piece, g, tier, false); }
  } else return { error: 'unknown action' };
  return out;
}
function finishEar(piece, g, tier, won) {
  g.done = true; g.won = won;
  // base was locked at the composer-naming try, so piece retries never cost earned points
  g.pts = won && g.scored ? (g.base || (MAX + 1 - g.marks.length)) * MULT[tier] * (g.pieceFound ? 2 : 1) : 0;
}

function applyFactsAction(composer, g, action, value, key) {
  if (g.done) return { error: 'game over' };
  const out = {};
  if (action === 'guess') {
    const gv = String(value || '').slice(0, 60);
    if (!norm(gv)) return { error: 'empty guess' };
    if (matchGuess(gv, composer)) {
      g.marks.push('win'); g.done = true; g.won = true;
      g.pts = g.scored ? (MAX + 1 - g.marks.length) * MULT[g.tier || 'easy'] : 0;
    } else {
      g.marks.push('wrong'); g.wrong.push(gv);
      const hit = COMPOSERS.find(c => matchGuess(gv, c));
      if (hit) out.strike = hit.name;
      if (g.clues < MAX) { g.clues++; out.clue = factsFor(composer, key, g.clues, g.tier).pop(); }
      else { g.done = true; g.won = false; g.pts = 0; }
    }
  } else if (action === 'clue') {
    if (g.clues >= MAX) return { error: 'no clues left' };
    g.marks.push('skip'); g.clues++;
    out.clue = factsFor(composer, key, g.clues, g.tier).pop();
    if (g.marks.length >= MAX) { g.done = true; g.won = false; g.pts = 0; }
  } else if (action === 'quit') {
    g.marks.push('skip'); g.done = true; g.won = false; g.pts = 0;
  } else return { error: 'unknown action' };
  return out;
}

// ---------- profile ----------
async function settleGame(token, key, g, day, isToday, name) {
  if (!g.scored) return null;
  const prof = (await readJSON(profileKey(token))) || {
    name: '', career: 0, games: 0, wins: 0, dist: {}, streak: { last: -99, cur: 0, max: 0 }, results: {},
  };
  // one browser = one identity: the client's current stage name rides every settle, so a
  // rename is applied in place and can't be undone by a stale profile read (Blob ~60s cache)
  const nm = String(name || '').trim().slice(0, 24);
  if (nm) prof.name = nm;
  if (prof.results[key] !== undefined) return prof; // already settled (also the replay guard for practice)
  const daily = /^\d+-/.test(key);
  prof.games++;
  if (g.won) { prof.wins++; prof.dist[g.marks.length] = (prof.dist[g.marks.length] || 0) + 1; }
  else prof.dist.x = (prof.dist.x || 0) + 1;
  prof.career += g.pts;
  // dailies keep the full record (feeds the once-a-day lock); practice keeps a replay marker only
  prof.results[key] = daily ? { pts: g.pts, marks: g.marks, won: g.won, pieceFound: !!g.pieceFound } : 1;
  // bound the profile blob: prune the oldest practice markers past 200
  const enc = Object.keys(prof.results).filter(k => k.startsWith('e-'));
  if (enc.length > 200) for (const k of enc.slice(0, enc.length - 150)) delete prof.results[k];
  if (daily && isToday && g.won) { // streaks stay a daily-puzzle thing
    prof.streak.cur = prof.streak.last === day - 1 ? prof.streak.cur + 1 : (prof.streak.last === day ? prof.streak.cur : 1);
    prof.streak.last = day;
    prof.streak.max = Math.max(prof.streak.max, prof.streak.cur);
  }
  await writeJSON(profileKey(token), prof);
  return prof;
}

module.exports = {
  MAX, TIERS, utcDay, pieceForDay, composerForDay, pieceById, assets,
  readJSON, writeJSON, loadAllProfiles, gameKey, profileKey, cleanToken,
  newGame, earView, factsView, publicState, earResult, factsResult,
  applyEarAction, applyFactsAction, settleGame, factIndices, factsFor,
  signGame, readGame, puzzleFor, gameFromResult,
};
