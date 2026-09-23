// App Store release through the App Store Connect API, run by .github/workflows/asc-release.yml.
// Creates (or reuses) an App Store version, sets What's New, uploads an app preview, attaches a
// build, and — only when SUBMIT=true — submits the version for App Review.
//
// env: ASC_KEY_P8 ASC_KEY_ID ASC_ISSUER_ID (repo secrets), VERSION, and optional BUILD,
//      WHATS_NEW, PREVIEW_URL, PREVIEW_TYPE (default IPHONE_67 = the 6.9"/6.7" slot),
//      PREVIEW_FRAME (poster frame, HH:MM:SS:FF), SUBMIT.
import { createHash, createPrivateKey, sign } from 'node:crypto';

const env = (k, d = '') => (process.env[k] || d).trim();
const BUNDLE = 'org.andypandy.composerdle';
const VERSION = env('VERSION');
const BUILD = env('BUILD');
const WHATS_NEW = env('WHATS_NEW');
const PREVIEW_URL = env('PREVIEW_URL');
const PREVIEW_TYPE = env('PREVIEW_TYPE', 'IPHONE_67');
const PREVIEW_FRAME = env('PREVIEW_FRAME');
const SUBMIT = env('SUBMIT') === 'true';
if (!VERSION) throw new Error('VERSION is required');

const key = createPrivateKey(process.env.ASC_KEY_P8);
const b64u = (s) => Buffer.from(s).toString('base64url');
function token() {   // ES256 JWT, minted per request (they live 20 minutes at most)
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: env('ASC_KEY_ID'), typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: env('ASC_ISSUER_ID'), iat: now, exp: now + 900, aud: 'appstoreconnect-v1' }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

async function api(method, path, data) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify({ data }) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${text.slice(0, 1200)}`);
  return text ? JSON.parse(text) : {};
}
const rel = (type, id) => ({ data: { type, id } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const app = (await api('GET', `/v1/apps?filter[bundleId]=${BUNDLE}`)).data[0];
if (!app) throw new Error(`no app with bundle id ${BUNDLE}`);

let ver = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[versionString]=${VERSION}&filter[platform]=IOS`)).data[0];
if (!ver) {
  ver = (await api('POST', '/v1/appStoreVersions', {
    type: 'appStoreVersions', attributes: { platform: 'IOS', versionString: VERSION }, relationships: { app: rel('apps', app.id) },
  })).data;
  console.log(`created version ${VERSION}`);
}
console.log(`version ${VERSION}: ${ver.attributes.appStoreState}`);

const locs = (await api('GET', `/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations`)).data;
const loc = locs.find((l) => l.attributes.locale === 'en-US') ?? locs[0];

if (WHATS_NEW) {
  await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, { type: 'appStoreVersionLocalizations', id: loc.id, attributes: { whatsNew: WHATS_NEW } });
  console.log(`What's New set (${loc.attributes.locale})`);
}

if (PREVIEW_URL) {
  const res = await fetch(PREVIEW_URL);
  if (!res.ok) throw new Error(`preview download -> ${res.status}`);
  const file = Buffer.from(await res.arrayBuffer());
  const fileName = decodeURIComponent(new URL(PREVIEW_URL).pathname.split('/').pop());
  const sets = (await api('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appPreviewSets`)).data;
  const set = sets.find((s) => s.attributes.previewType === PREVIEW_TYPE) ?? (await api('POST', '/v1/appPreviewSets', {
    type: 'appPreviewSets', attributes: { previewType: PREVIEW_TYPE }, relationships: { appStoreVersionLocalization: rel('appStoreVersionLocalizations', loc.id) },
  })).data;
  // A rerun replaces the copy it uploaded before instead of stacking a second one.
  for (const p of (await api('GET', `/v1/appPreviewSets/${set.id}/appPreviews`)).data) {
    if (p.attributes.fileName === fileName) await api('DELETE', `/v1/appPreviews/${p.id}`);
  }
  const prev = (await api('POST', '/v1/appPreviews', {
    type: 'appPreviews', attributes: { fileName, fileSize: file.length, mimeType: 'video/mp4' }, relationships: { appPreviewSet: rel('appPreviewSets', set.id) },
  })).data;
  for (const op of prev.attributes.uploadOperations) {
    const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
    const r = await fetch(op.url, { method: op.method, headers, body: file.subarray(op.offset, op.offset + op.length) });
    if (!r.ok) throw new Error(`preview upload part @${op.offset} -> ${r.status}`);
  }
  await api('PATCH', `/v1/appPreviews/${prev.id}`, {
    type: 'appPreviews', id: prev.id, attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(file).digest('hex') },
  });
  console.log(`preview uploaded: ${fileName} (${(file.length / 1048576).toFixed(1)} MB) into ${PREVIEW_TYPE}`);
  for (let i = 0; ; i++) {   // Apple validates and transcodes the video before it counts
    const st = (await api('GET', `/v1/appPreviews/${prev.id}`)).data.attributes.assetDeliveryState;
    if (st.state === 'COMPLETE') { console.log('preview processed'); break; }
    if (st.state === 'FAILED') throw new Error(`preview rejected: ${JSON.stringify(st.errors)}`);
    if (i >= 60) throw new Error(`preview still ${st.state} after 10 minutes`);
    await sleep(10_000);
  }
  if (PREVIEW_FRAME) {   // poster frame; a bad timecode is reported, not fatal
    try {
      await api('PATCH', `/v1/appPreviews/${prev.id}`, { type: 'appPreviews', id: prev.id, attributes: { previewFrameTimeCode: PREVIEW_FRAME } });
      console.log(`poster frame ${PREVIEW_FRAME}`);
    } catch (e) { console.log(`poster frame not set: ${e.message}`); }
  }
}

if (BUILD) {
  let build;
  for (let i = 0; ; i++) {   // TestFlight processing usually takes 5-20 minutes after upload
    build = (await api('GET', `/v1/builds?filter[app]=${app.id}&filter[version]=${BUILD}&filter[preReleaseVersion.version]=${VERSION}&limit=1`)).data[0];
    const state = build?.attributes.processingState;
    if (state === 'VALID') break;
    if (state === 'FAILED' || state === 'INVALID') throw new Error(`build ${BUILD} is ${state}`);
    if (i >= 90) throw new Error(`build ${BUILD} not ready after 30 minutes (${state ?? 'not uploaded'})`);
    console.log(`build ${BUILD}: ${state ?? 'not in App Store Connect yet'}, waiting`);
    await sleep(20_000);
  }
  await api('PATCH', `/v1/appStoreVersions/${ver.id}/relationships/build`, { type: 'builds', id: build.id });
  console.log(`build ${BUILD} attached to ${VERSION}`);
}

if (SUBMIT) {
  const sub = (await api('POST', '/v1/reviewSubmissions', { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: rel('apps', app.id) } })).data;
  await api('POST', '/v1/reviewSubmissionItems', { type: 'reviewSubmissionItems', relationships: { reviewSubmission: rel('reviewSubmissions', sub.id), appStoreVersion: rel('appStoreVersions', ver.id) } });
  await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } });
  console.log(`version ${VERSION} submitted for App Review`);
}
