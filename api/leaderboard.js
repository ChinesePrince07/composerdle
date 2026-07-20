// GET /api/leaderboard?scope=career|daily&day=&token= — aggregated from per-player profiles.
// ponytail: reads up to 500 profile objects from R2 per call, cached 30 s at the CDN (per
// full URL, so the token-specific `me` row is not shared between players); move to a single
// aggregated object if the hall ever outgrows a few hundred players.
const E = require('./_engine.js');

module.exports = async (req, res) => {
  const q = req.query || {};
  const scope = q.scope === 'daily' ? 'daily' : 'career';
  const day = parseInt(q.day, 10) >= 0 ? parseInt(q.day, 10) : E.utcDay();
  const token = E.cleanToken ? E.cleanToken(q.token) : (q.token || '');

  const scoreOf = p => scope === 'career'
    ? (p.career || 0)
    : Object.entries(p.results || {}).filter(([k]) => k.startsWith(`${day}-`))
        .reduce((s, [, v]) => s + (typeof v === 'number' ? v : (v && v.pts) || 0), 0);
  const row = p => ({ name: p.name, score: scoreOf(p), streak: p.streak ? p.streak.cur : 0 });

  // Store down → serve an empty board instead of 500ing the whole page.
  const profiles = (await E.loadAllProfiles(500)).filter(p => p && p.name);
  const ranked = profiles.map(row).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 25);

  // The caller's own standing — returned only when they have a score and fell outside the top 25,
  // so the client can pin their rank below the list. Rank counts strictly-higher scores (+1), so
  // duplicate stage names don't confuse it.
  let me = null;
  if (token) {
    const mine = await E.readJSON(E.profileKey(token));
    if (mine && mine.name) {
      const r = row(mine);
      if (r.score > 0) {
        const rank = ranked.filter(x => x.score > r.score).length + 1;
        if (rank > top.length) me = { ...r, rank };
      }
    }
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.json({ scope, day, top, me });
};
