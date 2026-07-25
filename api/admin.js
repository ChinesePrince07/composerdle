// GET/POST /api/admin — difficulty board. Drag a piece between Easy / Medium / Hard; the
// change is written to R2 (cdle/tier-overrides.json) and the live game re-tiers within a
// minute (see _engine.refreshTiers). No redeploy, no source edit.
//
// This page lists every piece title in the game, so it is gated on ADMIN_KEY and FAILS CLOSED:
// with no ADMIN_KEY in the environment the route serves 503 and nothing else. Unlock with
// /api/admin?key=<ADMIN_KEY> once — the key is then held in an HttpOnly cookie.
const crypto = require('crypto');
const E = require('./_engine.js');
const ASSETS = require('./_assets.json');

const COOKIE = 'cdle_admin';

function authorized(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return null;                       // fail closed — unset key disables the route
  const q = (req.query && req.query.key) || '';
  const cookie = (req.headers.cookie || '').split(';')
    .map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  const supplied = q || (cookie ? decodeURIComponent(cookie.slice(COOKIE.length + 1)) : '');
  if (!supplied) return false;
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(String(key));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Same audio URL the game serves, so the panel plays the exact clip players hear.
const AUDIO_HOST = process.env.AUDIO_HOST || '';
const audioFor = (p, a) => (a && a.id && AUDIO_HOST) ? `${AUDIO_HOST}/a/${a.id}.mp3` : (p.audio || null);

// Current tier of every piece, plus the tier it was authored in.
function board() {
  const home = {};
  for (const t of E.TIERS) for (const p of E.POOLS[t]) home[p.title] = t;
  const rows = [];
  for (const t of E.TIERS) for (const p of E.PIECES[t]) {
    const a = ASSETS[p.title];
    rows.push({
      title: p.title, composer: p.composer, tier: t, home: home[p.title],
      id: (a || {}).id || null, audio: audioFor(p, a),
    });
  }
  return rows;
}

module.exports = async (req, res) => {
  const ok = authorized(req);
  if (ok === null) return res.status(503).json({ error: 'admin disabled — ADMIN_KEY not set' });
  if (!ok) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.status(401).send(LOGIN);
  }
  // First unlock via ?key= — park it in an HttpOnly cookie so the key leaves the URL bar.
  if (req.query && req.query.key) {
    res.setHeader('set-cookie',
      `${COOKIE}=${encodeURIComponent(req.query.key)}; HttpOnly; Secure; SameSite=Lax; Path=/api/admin; Max-Age=31536000`);
  }

  await E.refreshTiers(true);

  if (req.method === 'POST') {
    const body = req.body || {};
    const map = body.overrides;
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      return res.status(400).json({ error: 'expected {overrides:{title:tier}}' });
    }
    const clean = {};
    for (const [title, tier] of Object.entries(map)) {
      if (E.TIERS.includes(tier)) clean[String(title)] = tier;
    }
    const saved = await E.writeJSON('tier-overrides.json', clean);
    if (!saved) return res.status(500).json({ error: 'R2 write failed' });
    E.applyTiers(clean);
    return res.status(200).json({ ok: true, count: Object.keys(clean).length });
  }

  if (req.query && req.query.data) return res.status(200).json(board());

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-robots-tag', 'noindex, nofollow');
  return res.status(200).send(PAGE);
};

const LOGIN = `<!doctype html><meta charset="utf-8"><title>Composerdle admin</title>
<style>body{font:16px/1.6 Georgia,serif;background:#f5eddb;color:#211c12;display:grid;place-items:center;height:100vh;margin:0}
form{background:#fbf5e7;border:1px solid #b6a276;border-radius:12px;padding:22px 24px;text-align:center}
input,button{font:inherit;padding:8px 12px;border:1px solid #b6a276;border-radius:8px;margin-top:10px}
button{background:#211c12;color:#fbf5e7;border-color:#211c12;cursor:pointer}</style>
<form method="get"><div>Admin key</div><input name="key" type="password" autofocus><br><button>Unlock</button></form>`;

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Composerdle · difficulty</title>
<style>
:root{--ink:#211c12;--soft:#5c5137;--paper:#f5eddb;--hi:#fbf5e7;--rule:#b6a276;--red:#7c2323;--gold:#9a7724}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Georgia,serif}
header{position:sticky;top:0;z-index:5;background:var(--hi);border-bottom:1px solid var(--rule);padding:10px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
h1{font-size:16px;margin:0;letter-spacing:.12em;text-transform:uppercase}
input{font:inherit;padding:5px 9px;border:1px solid var(--rule);border-radius:7px}
#state{font-size:13px;color:var(--soft);margin-left:auto}
main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px 14px;align-items:start}
@media (max-width:760px){main{grid-template-columns:1fr}}
.col{background:var(--hi);border:1px solid var(--rule);border-radius:10px;padding:10px;min-height:180px}
.col.over{outline:2px dashed var(--gold);background:#fffdf4}
.col h2{font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 8px;color:var(--red);display:flex;justify-content:space-between}
.chip{background:#fff;border:1px solid var(--rule);border-radius:8px;padding:6px 8px;margin-bottom:6px;cursor:grab;display:flex;gap:8px;align-items:center}
.chip:active{cursor:grabbing}
.chip.drag{opacity:.4}
.chip.moved{border-color:var(--gold);box-shadow:inset 3px 0 0 var(--gold)}
.chip .t{flex:1;min-width:0}
.chip .n{font-size:14px;line-height:1.25}
.chip .c{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}
.chip button{font:inherit;border:1px solid var(--rule);background:#fbf5e7;border-radius:6px;cursor:pointer;padding:2px 7px;color:var(--ink)}
.chip button[disabled]{opacity:.25;cursor:default}
.chip .pl{min-width:30px}
.chip.playing{border-color:var(--gold);background:#fffdf4}
.chip.playing .pl{background:var(--gold);color:var(--hi);border-color:var(--gold)}
#toast{position:fixed;right:14px;bottom:14px;background:var(--ink);color:var(--hi);padding:9px 14px;border-radius:8px;opacity:0;transition:opacity .2s}
#toast.on{opacity:1}
</style></head><body>
<header>
  <h1>Difficulty</h1>
  <input id="q" placeholder="filter composer / title" size="24">
  <span id="state">loading…</span>
</header>
<main id="board"></main>
<div id="toast"></div>
<script>
const TIERS = ['easy', 'medium', 'hard'];
let ROWS = [], saving = false;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function load() {
  ROWS = await (await fetch('/api/admin?data=1', { credentials: 'same-origin' })).json();
  render();
}

function render() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  document.getElementById('board').innerHTML = TIERS.map(t => {
    const all = ROWS.filter(r => r.tier === t);
    const shown = all.filter(r => !q || (r.composer + ' ' + r.title).toLowerCase().includes(q));
    return '<section class="col" data-tier="' + t + '"><h2>' + t + '<span>' + all.length + '</span></h2>' +
      shown.map(chip).join('') + '</section>';
  }).join('');
  const moved = ROWS.filter(r => r.tier !== r.home).length;
  document.getElementById('state').textContent = ROWS.length + ' pieces · ' + moved + ' retiered';
  syncPlaying();   // a drag re-renders the board; keep the sounding chip marked
}

function chip(r) {
  const i = TIERS.indexOf(r.tier);
  const play = r.audio
    ? '<button class="pl" draggable="false" data-audio="' + esc(r.audio) + '">&#9654;</button>'
    : '<button class="pl" disabled>&#9654;</button>';
  return '<div class="chip' + (r.tier !== r.home ? ' moved' : '') + '" draggable="true" data-title="' + esc(r.title) + '">' +
    play +
    '<button class="mv" data-dir="-1"' + (i === 0 ? ' disabled' : '') + '>&lsaquo;</button>' +
    '<span class="t"><span class="n">' + esc(r.title) + '</span><br><span class="c">' + esc(r.composer) + '</span></span>' +
    '<button class="mv" data-dir="1"' + (i === 2 ? ' disabled' : '') + '>&rsaquo;</button></div>';
}

function toast(msg, bad) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = bad ? '#7c2323' : '#211c12';
  t.classList.add('on');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2200);
}

// Persist the full override map: every piece not sitting in its authored tier.
async function save() {
  if (saving) return;
  saving = true;
  const overrides = {};
  for (const r of ROWS) if (r.tier !== r.home) overrides[r.title] = r.tier;
  try {
    const res = await fetch('/api/admin', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overrides }),
    });
    const j = await res.json();
    toast(j.ok ? 'saved · ' + j.count + ' retiered' : (j.error || 'save failed'), !j.ok);
  } catch (e) { toast('save failed: ' + e.message, true); }
  saving = false;
}

function move(title, tier) {
  const r = ROWS.find(x => x.title === title);
  if (!r || !tier || r.tier === tier) return;
  r.tier = tier;
  render();
  save();
}

let dragged = null;
document.addEventListener('dragstart', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  dragged = c.dataset.title;
  c.classList.add('drag');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragged);
});
document.addEventListener('dragend', e => {
  const c = e.target.closest('.chip');
  if (c) c.classList.remove('drag');
  document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over'));
});
document.addEventListener('dragover', e => {
  const col = e.target.closest('.col');
  if (!col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over'));
  col.classList.add('over');
});
document.addEventListener('drop', e => {
  const col = e.target.closest('.col');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('over');
  const title = dragged || e.dataTransfer.getData('text/plain');
  dragged = null;
  if (title) move(title, col.dataset.tier);
});

// One shared player: starting a piece stops whatever was sounding, so the columns never
// overlap. The Audio object lives outside the DOM, so a re-render mid-playback is harmless —
// syncPlaying() just re-marks the chip afterwards.
let player = null, playingTitle = null;
function syncPlaying() {
  document.querySelectorAll('.chip').forEach(c => {
    const on = c.dataset.title === playingTitle;
    c.classList.toggle('playing', on);
    const b = c.querySelector('.pl');
    if (b && !b.disabled) b.innerHTML = on ? '&#10073;&#10073;' : '&#9654;';
  });
}
function stop() { if (player) { player.pause(); } playingTitle = null; syncPlaying(); }
document.addEventListener('click', e => {
  const b = e.target.closest('.pl');
  if (!b || b.disabled) return;
  const title = b.closest('.chip').dataset.title;
  if (playingTitle === title) return stop();
  if (!player) {
    player = new Audio();
    player.addEventListener('ended', stop);
    player.addEventListener('error', () => { toast('audio failed to load', true); stop(); });
  }
  player.src = b.dataset.audio;
  playingTitle = title;
  syncPlaying();
  player.play().catch(err => { toast('playback blocked: ' + err.message, true); stop(); });
});

// Touch-friendly fallback — dragging is awkward on a phone.
document.addEventListener('click', e => {
  const b = e.target.closest('.mv');
  if (!b) return;
  const title = b.closest('.chip').dataset.title;
  const r = ROWS.find(x => x.title === title);
  if (r) move(title, TIERS[TIERS.indexOf(r.tier) + Number(b.dataset.dir)]);
});
document.getElementById('q').addEventListener('input', render);

load();
</script></body></html>`;
