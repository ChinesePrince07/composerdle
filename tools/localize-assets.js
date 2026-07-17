// One-shot/idempotent: pull every remote score page + audio file local, strip identifying
// filenames (opaque ids), convert pages to WebP into /s/<id>/<n>.webp.
// Ids persist across runs via asset-map.json (title-keyed). Run: node tools/localize-assets.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PIECES } = require('../api/_pieces.js');

const ROOT = path.join(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'tools', 'audio-cache');
const MAP_FILE = path.join(ROOT, 'api', '_assets.json');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

const UA = '-A "Composerdle/1.0 (personal game; no-reply, via github ChinesePrince07)"';
const curl = (out, url) => execSync(`curl -sL --fail --retry 3 --retry-delay 5 ${UA} -o "${out}" "${url}"`, { timeout: 600000 });

const map = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE)) : {};
let maxId = Object.values(map).reduce((m, v) => Math.max(m, +v.id.slice(1)), 0);
const failures = [];

for (const [tier, pool] of Object.entries(PIECES)) {
  for (const p of pool) {
    try {
      const id = map[p.title] ? map[p.title].id : 'p' + String(++maxId).padStart(2, '0');
      const dir = path.join(ROOT, 's', id);
      fs.mkdirSync(dir, { recursive: true });
      const pages = [];
      p.pages.forEach((u, i) => {
        const out = path.join(dir, `${i + 1}.webp`);
        if (!fs.existsSync(out)) {
          let src;
          if (u.startsWith('scores/')) src = path.join(ROOT, u);
          else { src = path.join(AUDIO_DIR, `page-${id}-${i}`); curl(src, u); }
          execSync(`convert "${src}" -resize '1280x>' -quality 80 "${out}"`, { timeout: 60000 });
        }
        pages.push(`s/${id}/${i + 1}.webp`);
      });
      const audioFile = path.join(AUDIO_DIR, `${id}.mp3`);
      if (!fs.existsSync(audioFile)) curl(audioFile, p.audio);
      map[p.title] = { id, tier, pages, audioLocal: `tools/audio-cache/${id}.mp3` };
      console.log('ok', id, tier, p.title);
    } catch (e) {
      failures.push(p.title);
      console.log('FAIL', tier, p.title, e.message.split('\n')[0]);
    }
  }
}
fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
console.log(failures.length ? `FAILURES: ${failures.join(' | ')}` : `done — ${Object.keys(map).length} pieces mapped`);
