#!/usr/bin/env node
// Pull the live difficulty tiers back into api/_pieces.js.
//
// The deployed admin panel writes tier changes to R2 (cdle/tier-overrides.json), and the game
// treats that object as authoritative — so retiering done in the panel never reaches git. If the
// object were ever lost, every tier would silently revert to whatever the source last said. This
// closes that gap by writing the live state back into TIER_OVERRIDES.
//
// Reads through the admin endpoint rather than R2 directly, so it needs one secret (ADMIN_KEY)
// instead of a full set of storage credentials.
//
//   ADMIN_KEY=... node tools/sync-tiers.js [--check]
//
// --check exits 1 when source and live disagree, without writing.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'api', '_pieces.js');
const SITE = process.env.SITE || 'https://composerdle.andypandy.org';
const KEY = process.env.ADMIN_KEY || '';
const CHECK = process.argv.includes('--check');

function splitOnce(s, sep) {
  const i = s.indexOf(sep);
  if (i < 0) throw new Error(`marker ${sep} missing from api/_pieces.js`);
  return [s.slice(0, i), s.slice(i + sep.length)];
}

function parseOverrides(src) {
  const body = (src.split('TIER_OVERRIDES_START')[1] || '').split('TIER_OVERRIDES_END')[0] || '';
  const out = {};
  for (const m of body.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'(easy|medium|hard)',\s*$/gm)) {
    out[m[1].replace(/\\'/g, "'")] = m[2];
  }
  return out;
}

function writeOverrides(overrides) {
  const [head, rest] = splitOnce(fs.readFileSync(SRC, 'utf8'), 'TIER_OVERRIDES_START');
  const [, tail] = splitOnce(rest, 'TIER_OVERRIDES_END');
  const lines = Object.keys(overrides).sort()
    .map(t => `  '${t.replace(/'/g, "\\'")}': '${overrides[t]}',`).join('\n');
  const block = ` — machine-edited by tools/admin.js, keep the markers\nconst TIER_OVERRIDES = {\n${lines}${lines ? '\n' : ''}};\n// `;
  fs.writeFileSync(SRC, `${head}TIER_OVERRIDES_START${block}TIER_OVERRIDES_END${tail}`);
}

(async () => {
  if (!KEY) {
    console.error('ADMIN_KEY is not set — cannot read the live tiers');
    process.exit(2);
  }

  const url = `${SITE}/api/admin?data=1&key=${encodeURIComponent(KEY)}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    console.error(`admin endpoint returned ${res.status} — wrong ADMIN_KEY, or the route is disabled`);
    process.exit(2);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) {
    console.error('admin endpoint returned no pieces; refusing to rewrite the source from nothing');
    process.exit(2);
  }

  // Live state: anything not sitting in the tier it was authored in.
  const live = {};
  for (const r of rows) if (r.title && r.tier && r.tier !== r.home) live[r.title] = r.tier;

  const current = parseOverrides(fs.readFileSync(SRC, 'utf8'));
  const titles = [...new Set([...Object.keys(current), ...Object.keys(live)])].sort();
  const changes = titles
    .filter(t => current[t] !== live[t])
    .map(t => `  ${current[t] || '(home)'} -> ${live[t] || '(home)'}   ${t}`);

  console.log(`${rows.length} pieces live · ${Object.keys(live).length} retiered · ${changes.length} differ from source`);
  if (!changes.length) {
    console.log('source already matches the live tiers');
    return;
  }
  console.log(changes.join('\n'));

  if (CHECK) {
    console.error('--check: source is out of date');
    process.exit(1);
  }

  writeOverrides(live);
  // Parse check: a broken _pieces.js would take the whole API down.
  delete require.cache[require.resolve(SRC)];
  const { PIECES } = require(SRC);
  const counts = ['easy', 'medium', 'hard'].map(t => `${t} ${PIECES[t].length}`).join(' · ');
  console.log(`written — ${counts}`);
})().catch(e => { console.error(e.message || e); process.exit(2); });
