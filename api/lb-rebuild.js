// GET/POST /api/lb-rebuild?key=<ADMIN_KEY> — rebuild cdle/leaderboard.json from every profile.
// Slow (seconds, linear in player count), so it is never called from a user-facing request:
// settles keep the aggregate current incrementally. Use this to backfill it the first time,
// or to repair it after concurrent settles drop a row.
const crypto = require('crypto');
const E = require('./_engine.js');

module.exports = async (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key) return res.status(503).json({ error: 'admin disabled — ADMIN_KEY not set' });
  const supplied = String((req.query && req.query.key) || '');
  const a = Buffer.from(supplied);
  const b = Buffer.from(String(key));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const started = Date.now();
  const lb = await E.lbRebuild();
  if (!lb) return res.status(500).json({ error: 'rebuild failed (R2 unavailable?)' });

  const rows = Object.values(lb.users);
  const scoring = rows.filter(r => r.c > 0).sort((x, y) => y.c - x.c);
  res.status(200).json({
    ok: true,
    ms: Date.now() - started,
    players: rows.length,
    scoring: scoring.length,
    top: scoring.slice(0, 5).map(r => ({ name: r.n, career: r.c })),
  });
};
