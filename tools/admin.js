#!/usr/bin/env node
// Composerdle admin panel — LOCAL ONLY (binds 127.0.0.1). Never deploy this: it shows every
// answer in the game. Run `node tools/admin.js`, open http://localhost:5174.
//
// View + debug every By Ear piece (audio, score page 1 with the crop band drawn exactly as the
// player sees it, licence, metadata, warnings) and retier pieces. Saving rewrites the
// TIER_OVERRIDES block in api/_pieces.js (and per-entry `crop:`), so changes are ordinary source
// edits you review with `git diff` and commit yourself.

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'api', '_pieces.js');
const PORT = Number(process.env.ADMIN_PORT) || 5174;

// R2 public base, for pieces whose rendered assets aren't on this machine.
function env(name) {
  const f = path.join(ROOT, '.env.local');
  if (!fs.existsSync(f)) return '';
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, '').replace(/\/$/, '');
  }
  return '';
}
const R2 = (env('R2_PUBLIC_BASE_URL') || env('AUDIO_HOST') || '').replace(/\/$/, '');

// ---- source parsing -------------------------------------------------------

const readSrc = () => fs.readFileSync(SRC, 'utf8');

// Which array a piece is authored in — needed to know whether a chosen tier is an override.
function homeTiers(src) {
  const bounds = [['easy', src.indexOf('const EASY = [')], ['medium', src.indexOf('const MEDIUM = [')], ['hard', src.indexOf('const HARD = [')]]
    .filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
  return (title) => {
    const i = src.indexOf(`title: '${title}'`);
    if (i < 0) return null;
    let home = null;
    for (const [tier, start] of bounds) if (i > start) home = tier;
    return home;
  };
}

function parseOverrides(src) {
  const body = (src.split('TIER_OVERRIDES_START')[1] || '').split('TIER_OVERRIDES_END')[0] || '';
  const out = {};
  for (const m of body.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'(easy|medium|hard)',\s*$/gm)) {
    out[m[1].replace(/\\'/g, "'")] = m[2];
  }
  return out;
}

function splitOnce(s, sep) {
  const i = s.indexOf(sep);
  if (i < 0) throw new Error(`marker ${sep} missing from api/_pieces.js`);
  return [s.slice(0, i), s.slice(i + sep.length)];
}

function writeOverrides(overrides) {
  const [head, rest] = splitOnce(readSrc(), 'TIER_OVERRIDES_START');
  const [, tail] = splitOnce(rest, 'TIER_OVERRIDES_END');
  const lines = Object.keys(overrides).sort()
    .map(t => `  '${t.replace(/'/g, "\\'")}': '${overrides[t]}',`).join('\n');
  const block = ` — machine-edited by tools/admin.js, keep the markers\nconst TIER_OVERRIDES = {\n${lines}${lines ? '\n' : ''}};\n// `;
  fs.writeFileSync(SRC, `${head}TIER_OVERRIDES_START${block}TIER_OVERRIDES_END${tail}`);
}

// Rewrite `crop:` inside one entry, or insert it before that entry's `pages:`.
function writeCrop(title, crop) {
  const src = readSrc();
  const i = src.indexOf(`title: '${title}'`);
  if (i < 0) throw new Error('piece not found: ' + title);
  const end = src.indexOf('\n  },', i);
  if (end < 0) throw new Error('entry end not found: ' + title);
  const entry = src.slice(i, end);
  const next = /\n\s*crop: [\d.]+,/.test(entry)
    ? entry.replace(/\n(\s*)crop: [\d.]+,/, `\n$1crop: ${crop},`)
    : entry.replace(/\n(\s*)pages:/, `\n$1crop: ${crop},\n$1pages:`);
  fs.writeFileSync(SRC, src.slice(0, i) + next + src.slice(end));
}

// ---- data for the page ----------------------------------------------------

function collect() {
  delete require.cache[require.resolve(SRC)];
  const { PIECES } = require(SRC);
  const src = readSrc();
  const home = homeTiers(src);
  const overrides = parseOverrides(src);
  const assets = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', '_assets.json'), 'utf8'));

  const seen = new Set();
  const rows = [];
  for (const tier of ['easy', 'medium', 'hard']) for (const p of PIECES[tier]) {
    const a = assets[p.title];
    const pages = (a && a.pages ? a.pages : []).map(u => '/asset/' + u);
    const warn = [];
    if (!a) warn.push('no localized assets — run tools/localize-assets.js');
    if (!pages.length) warn.push('no score pages');
    else if (pages.length === 1) warn.push('only one score page');
    if (p.crop === undefined) warn.push('no crop set — check page 1 for a name/title leak');
    if (!p.performer || !p.license) warn.push('missing performer/licence attribution');
    if (!p.year) warn.push('no META entry (year/genre/keys)');
    if (seen.has(p.title)) warn.push('duplicate title');
    seen.add(p.title);

    rows.push({
      title: p.title, composer: p.composer, tier, home: home(p.title),
      overridden: !!overrides[p.title] && home(p.title) !== tier,
      crop: p.crop === undefined ? 0 : p.crop,
      performer: p.performer || '', license: p.license || '', scoreNote: p.scoreNote || '',
      year: p.year || null, genre: p.genre || '', keys: p.keys || [],
      id: (a && a.id) || null, audio: a && a.id ? '/audio/' + a.id : null,
      pages, warn,
    });
  }
  return rows;
}

// ---- server ---------------------------------------------------------------

function send(res, code, type, body) {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

// Serve a rendered asset from disk when it's here, else bounce to R2 (what production serves).
function serveAsset(res, rel) {
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(ROOT, safe);
  if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file);
    const type = ext === '.webp' ? 'image/webp' : ext === '.mp3' ? 'audio/mpeg'
      : ext === '.jpg' ? 'image/jpeg' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    return fs.createReadStream(file).pipe(res);
  }
  if (!R2) return send(res, 404, 'text/plain', 'not found locally and no R2_PUBLIC_BASE_URL');
  res.writeHead(302, { location: `${R2}/cdle/${safe}` });
  res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/') return send(res, 200, 'text/html; charset=utf-8', PAGE);
    if (url.pathname === '/data') return send(res, 200, 'application/json', JSON.stringify(collect()));
    if (url.pathname.startsWith('/asset/')) return serveAsset(res, decodeURIComponent(url.pathname.slice(7)));
    if (url.pathname.startsWith('/audio/')) return serveAsset(res, 'a/' + decodeURIComponent(url.pathname.slice(7)) + '.mp3');

    if (url.pathname === '/save' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
      return req.on('end', () => {
        try {
          const { title, tier, crop } = JSON.parse(body);
          if (tier) {
            const src = readSrc();
            const home = homeTiers(src)(title);
            if (!home) throw new Error('piece not found: ' + title);
            const ov = parseOverrides(src);
            if (tier === home) delete ov[title]; else ov[title] = tier;
            writeOverrides(ov);
          }
          if (crop !== undefined && crop !== null) writeCrop(title, Number(crop));
          delete require.cache[require.resolve(SRC)];
          require(SRC);   // parse check — throws before the client reports success
          send(res, 200, 'application/json', JSON.stringify({ ok: true }));
        } catch (e) {
          send(res, 400, 'application/json', JSON.stringify({ ok: false, error: String(e.message || e) }));
        }
      });
    }
    send(res, 404, 'text/plain', 'not found');
  } catch (e) {
    send(res, 500, 'text/plain', String(e.stack || e));
  }
});

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Composerdle admin</title>
<style>
:root{--ink:#211c12;--soft:#5c5137;--paper:#f5eddb;--hi:#fbf5e7;--rule:#b6a276;--red:#7c2323;--gold:#9a7724}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Georgia,serif}
header{position:sticky;top:0;z-index:5;background:var(--hi);border-bottom:1px solid var(--rule);padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
h1{font-size:17px;margin:0 12px 0 0;letter-spacing:.12em;text-transform:uppercase}
.counts b{font-variant-numeric:tabular-nums}
input,select,button{font:inherit;padding:5px 9px;border:1px solid var(--rule);border-radius:7px;background:#fff;color:var(--ink)}
button{cursor:pointer;background:var(--ink);color:var(--hi);border-color:var(--ink)}
main{padding:14px 16px;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(430px,1fr))}
.card{background:var(--hi);border:1px solid var(--rule);border-radius:10px;padding:11px 13px;display:grid;gap:8px}
.card.dirty{outline:2px solid var(--gold)}
.hd{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.comp{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--red)}
.ttl{font-size:16px;font-weight:600;line-height:1.25}
.id{font:12px ui-monospace,monospace;color:var(--soft)}
.meta{font-size:12.5px;color:var(--soft)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pv{position:relative;width:100%;background:#fff;border:1px solid var(--rule);border-radius:6px;overflow:hidden;min-height:60px}
.pv img{display:block;width:100%}
.pv .band{position:absolute;inset:0 0 auto 0;background:repeating-linear-gradient(45deg,rgba(33,28,18,.86) 0 8px,rgba(33,28,18,.72) 8px 16px);color:#fbf5e7;font:11px/1 system-ui;display:flex;align-items:flex-end;justify-content:flex-end;padding:3px 5px}
audio{width:100%;height:32px}
.warn{font-size:12.5px;color:var(--red)}
.badge{font-size:11px;letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--gold);border-radius:99px;padding:2px 8px;color:var(--gold)}
#toast{position:fixed;right:14px;bottom:14px;background:var(--ink);color:var(--hi);padding:9px 14px;border-radius:8px;opacity:0;transition:opacity .2s}
#toast.on{opacity:1}
</style></head><body>
<header>
  <h1>Composerdle admin</h1>
  <span class="counts" id="counts"></span>
  <input id="q" placeholder="search composer / title / licence" size="28">
  <select id="ft"><option value="">all tiers</option><option>easy</option><option>medium</option><option>hard</option></select>
  <label class="meta"><input type="checkbox" id="fw"> only warnings</label>
  <label class="meta"><input type="checkbox" id="fo"> only retiered</label>
</header>
<main id="list"></main>
<div id="toast"></div>
<script>
let ROWS = [];
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function load() { ROWS = await (await fetch('/data')).json(); render(); }

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const ft = $('#ft').value, fw = $('#fw').checked, fo = $('#fo').checked;
  const rows = ROWS.filter(r =>
    (!ft || r.tier === ft) && (!fw || r.warn.length) && (!fo || r.overridden) &&
    (!q || (r.composer + ' ' + r.title + ' ' + r.license + ' ' + r.performer).toLowerCase().includes(q)));
  const n = t => ROWS.filter(r => r.tier === t).length;
  $('#counts').innerHTML = 'easy <b>' + n('easy') + '</b> · medium <b>' + n('medium') + '</b> · hard <b>' + n('hard') +
    '</b> · total <b>' + ROWS.length + '</b> · showing <b>' + rows.length + '</b>';
  $('#list').innerHTML = rows.map(card).join('');
}

function card(r) {
  const pv = r.pages[0]
    ? '<div class="pv"><img loading="lazy" src="' + r.pages[0] + '" alt="">' +
      '<div class="band" style="height:' + (r.crop * 100) + '%">hidden ' + Math.round(r.crop * 100) + '%</div></div>'
    : '<div class="pv meta" style="padding:8px">no score page</div>';
  return '<div class="card" data-title="' + esc(r.title) + '">' +
    '<div class="hd"><div><div class="comp">' + esc(r.composer) + '</div><div class="ttl">' + esc(r.title) + '</div></div>' +
    '<div style="text-align:right"><div class="id">' + esc(r.id || '—') + '</div>' +
    (r.overridden ? '<span class="badge">from ' + r.home + '</span>' : '') + '</div></div>' +
    pv +
    (r.audio ? '<audio controls preload="none" src="' + r.audio + '"></audio>' : '<div class="warn">no audio</div>') +
    '<div class="row">' +
      '<select class="tier">' + ['easy','medium','hard'].map(t =>
        '<option' + (t === r.tier ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
      '<label class="meta">crop <input class="crop" type="number" step="0.01" min="0" max="0.5" value="' + r.crop + '" style="width:76px"></label>' +
      '<button class="save">save</button>' +
      (r.pages.length ? '<a class="meta" href="' + r.pages[0] + '" target="_blank">page 1 ↗</a>' : '') +
      '<span class="meta">' + r.pages.length + ' pages</span>' +
    '</div>' +
    '<div class="meta">' + esc(r.performer) + (r.license ? ' · ' + esc(r.license) : '') + '</div>' +
    '<div class="meta">' + (r.year || '—') + ' · ' + esc(r.genre || '—') + ' · keys: ' + esc((r.keys || []).join(', ') || '—') + '</div>' +
    (r.scoreNote ? '<div class="meta">' + esc(r.scoreNote) + '</div>' : '') +
    (r.warn.length ? '<div class="warn">⚠ ' + r.warn.map(esc).join(' · ') + '</div>' : '') +
  '</div>';
}

function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg;
  t.style.background = bad ? '#7c2323' : '#211c12';
  t.classList.add('on');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2400);
}

document.addEventListener('input', e => {
  if (e.target.matches('.tier,.crop')) e.target.closest('.card').classList.add('dirty');
  if (e.target.matches('.crop')) {
    const band = e.target.closest('.card').querySelector('.band');
    if (band) { band.style.height = (Number(e.target.value) * 100) + '%'; band.textContent = 'hidden ' + Math.round(e.target.value * 100) + '%'; }
  }
  if (e.target.matches('#q')) render();
});
document.addEventListener('change', e => { if (e.target.matches('#ft,#fw,#fo')) render(); });

document.addEventListener('click', async e => {
  if (!e.target.matches('.save')) return;
  const card = e.target.closest('.card');
  const body = {
    title: card.dataset.title,
    tier: card.querySelector('.tier').value,
    crop: Number(card.querySelector('.crop').value),
  };
  e.target.disabled = true;
  const r = await (await fetch('/save', { method: 'POST', body: JSON.stringify(body) })).json();
  e.target.disabled = false;
  if (!r.ok) return toast(r.error, true);
  card.classList.remove('dirty');
  toast('saved · ' + body.title.slice(0, 40));
  load();
});

load();
</script></body></html>`;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`admin panel  →  http://localhost:${PORT}`);
  console.log('local only (127.0.0.1). edits go straight into api/_pieces.js — review with `git diff` before committing.');
  if (!R2) console.log('note: no R2_PUBLIC_BASE_URL in .env.local — only locally rendered assets will display.');
});
