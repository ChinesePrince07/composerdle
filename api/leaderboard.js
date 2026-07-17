// GET /api/leaderboard?scope=career|daily&day= — aggregated from per-player profiles.
// ponytail: lists + fetches up to 200 profile blobs per call, cached 30 s at the CDN;
// move to a real KV when the hall outgrows a few hundred players.
const { list } = require('@vercel/blob');
const E = require('./_engine.js');

module.exports = async (req, res) => {
  const q = req.query || {};
  const scope = q.scope === 'daily' ? 'daily' : 'career';
  const day = parseInt(q.day, 10) >= 0 ? parseInt(q.day, 10) : E.utcDay();

  const { blobs } = await list({ prefix: 'u/', limit: 200 });
  const profiles = (await Promise.all(blobs.map(async b => {
    try { return await (await fetch(`${b.url}?ts=${Date.now()}`, { cache: 'no-store' })).json(); }
    catch (e) { return null; }
  }))).filter(p => p && p.name);

  const rows = profiles.map(p => ({
    name: p.name,
    score: scope === 'career'
      ? p.career
      : Object.entries(p.results || {}).filter(([k]) => k.startsWith(`${day}-`))
          .reduce((s, [, v]) => s + (typeof v === 'number' ? v : (v && v.pts) || 0), 0),
    streak: p.streak ? p.streak.cur : 0,
  })).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.json({ scope, day, top: rows });
};
