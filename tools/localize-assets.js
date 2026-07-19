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

// Score pages are served from R2 (env SCORE_HOST) because the gitignored s/ dir is absent
// from git-triggered Vercel deploys. Sync every rendered webp to R2 so new pieces show up.
// Loads creds from .env.local; skips silently if R2 isn't configured.
(async () => {
  const envFile = path.join(ROOT, '.env.local');
  if (fs.existsSync(envFile)) for (const l of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  if (!process.env.R2_S3_ENDPOINT) return;
  let S3, Put; try { ({ S3Client: S3, PutObjectCommand: Put } = require('@aws-sdk/client-s3')); } catch (e) { console.log('R2 sync skipped (no @aws-sdk/client-s3)'); return; }
  const s3 = new S3({ region: 'auto', endpoint: process.env.R2_S3_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
  const webps = [];
  for (const d of fs.readdirSync(path.join(ROOT, 's'))) { const dir = path.join(ROOT, 's', d); if (!fs.statSync(dir).isDirectory()) continue; for (const f of fs.readdirSync(dir)) if (f.endsWith('.webp')) webps.push(`s/${d}/${f}`); }
  let up = 0;
  for (let i = 0; i < webps.length; i += 24) await Promise.all(webps.slice(i, i + 24).map(async f => {
    await s3.send(new Put({ Bucket: process.env.R2_BUCKET, Key: `cdle/${f}`, Body: fs.readFileSync(path.join(ROOT, f)), ContentType: 'image/webp' })); up++;
  }));
  console.log(`R2: synced ${up} score pages`);

  // Audio too (env AUDIO_HOST serves cdle/a/<id>.mp3): upload any cached mp3 not yet on R2,
  // with ID3 metadata stripped so the file doesn't leak the composer/title to cheaters.
  const { ListObjectsV2Command: List } = require('@aws-sdk/client-s3');
  const have = new Set();
  let tok; do {
    const r = await s3.send(new List({ Bucket: process.env.R2_BUCKET, Prefix: 'cdle/a/', ContinuationToken: tok }));
    for (const o of r.Contents || []) have.add(path.basename(o.Key));
    tok = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (tok);
  const os = require('os');
  let aup = 0;
  for (const f of fs.readdirSync(AUDIO_DIR)) {
    if (!/^p\d+\.mp3$/.test(f) || have.has(f)) continue;
    const tmp = path.join(os.tmpdir(), 'cdle-' + f);
    execSync(`ffmpeg -hide_banner -loglevel error -y -i "${path.join(AUDIO_DIR, f)}" -map 0:a -c copy -map_metadata -1 -id3v2_version 3 "${tmp}"`, { timeout: 120000 });
    await s3.send(new Put({ Bucket: process.env.R2_BUCKET, Key: `cdle/a/${f}`, Body: fs.readFileSync(tmp), ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    fs.unlinkSync(tmp); aup++;
  }
  if (aup) console.log(`R2: synced ${aup} audio files`);
})();
