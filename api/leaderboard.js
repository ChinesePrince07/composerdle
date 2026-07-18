// GET /api/leaderboard?scope=career|daily&day= — aggregated from per-player profiles.
// ponytail: reads up to 500 profile objects from R2 per call, cached 30 s at the CDN;
// move to a single aggregated object if the hall ever outgrows a few hundred players.
const E = require('./_engine.js');

module.exports = async (req, res) => {
  const q = req.query || {};
  const scope = q.scope === 'daily' ? 'daily' : 'career';
  const day = parseInt(q.day, 10) >= 0 ? parseInt(q.day, 10) : E.utcDay();

  // Store down → serve an empty board instead of 500ing the whole page.
  const profiles = (await E.loadAllProfiles(500)).filter(p => p && p.name);

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
