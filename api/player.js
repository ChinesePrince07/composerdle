// GET /api/player?token= → profile · POST {token, name} → set display name
const E = require('./_engine.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    const token = E.cleanToken((req.body || {}).token);
    const name = String((req.body || {}).name || '').trim().slice(0, 24);
    if (!token || !name) return res.status(400).json({ error: 'token and name required' });
    const prof = (await E.readJSON(E.profileKey(token))) || {
      name: '', career: 0, games: 0, wins: 0, dist: {}, streak: { last: -99, cur: 0, max: 0 }, results: {},
    };
    prof.name = name;
    await E.writeJSON(E.profileKey(token), prof);
    return res.json({ ok: true, name });
  }
  const token = E.cleanToken((req.query || {}).token);
  if (!token) return res.status(400).json({ error: 'bad token' });
  const prof = await E.readJSON(E.profileKey(token));
  if (!prof) return res.json({ name: '', career: 0, games: 0, wins: 0, dist: {}, streak: { cur: 0, max: 0 } });
  const { name, career, games, wins, dist, streak } = prof;
  res.json({ name, career, games, wins, dist, streak: { cur: streak.cur, max: streak.max } });
};
