// POST /api/guess {token, gs, action, value} — applies one action to the signed game state.
// The state travels in the HMAC-signed `gs` token (no Blob read), so there's no read-after-write
// race; the signature keeps the client from forging state, so the server stays authoritative.
const E = require('./_engine.js');

module.exports = async (req, res) => {
  const b = req.body || {};
  const token = E.cleanToken(b.token);
  const parsed = E.readGame(b.gs);
  if (!token || !parsed) return res.status(400).json({ error: 'bad request' });
  const { key, g } = parsed;

  const ctx = E.puzzleFor(key, g);
  if (!ctx || (ctx.mode === 'ear' && !ctx.piece)) return res.status(400).json({ error: 'bad game' });

  const action = String(b.action || '');
  const out = ctx.mode === 'ear'
    ? E.applyEarAction(ctx.piece, g, ctx.tier || 'easy', action, b.value)
    : E.applyFactsAction(ctx.composer, g, action, b.value, key);
  if (out.error) return res.status(400).json(out);

  const resp = { ...out, state: E.publicState(g), gs: E.signGame(key, g) };
  // facts: hand back the full authoritative clue list so the client never appends blind
  if (ctx.mode === 'facts') resp.clues = E.factsFor(ctx.composer, key, g.clues, g.tier);
  if (g.done) {
    resp.state.result = ctx.mode === 'ear' ? E.earResult(ctx.piece, g) : E.factsResult(ctx.composer, g);
    if (ctx.mode === 'ear') resp.state.result.challengeId = E.assets(ctx.piece).id;
    // settle every scored game — the single profile write per game
    if (g.scored) {
      const today = E.utcDay();
      const isToday = (ctx.day ?? today) === today;
      const prof = await E.settleGame(token, key, g, ctx.day ?? today, isToday, b.name);
      if (prof) { resp.career = prof.career; resp.streak = prof.streak.cur; }
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(resp);
};
