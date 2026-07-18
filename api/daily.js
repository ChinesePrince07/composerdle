// GET /api/daily?token=&mode=ear|facts&tier=&day=&nonce=&challenge=
// Returns the sanitized puzzle + a signed game-state token (no Blob read for live state).
const E = require('./_engine.js');

module.exports = async (req, res) => {
  const q = req.query || {};
  const token = E.cleanToken(q.token);
  if (!token) return res.status(400).json({ error: 'bad token' });
  const mode = q.mode === 'facts' ? 'facts' : 'ear';
  const tier = E.TIERS.includes(q.tier) ? q.tier : 'easy';
  const today = E.utcDay();
  const day = Math.min(parseInt(q.day, 10) >= 0 ? parseInt(q.day, 10) : today, today);

  // resolve the game key + whether it counts toward score/leaderboard
  let key, scored = true;
  if (q.challenge) {
    const id = String(q.challenge).slice(0, 8);
    if (!E.pieceById(id)) return res.status(404).json({ error: 'unknown challenge' });
    key = `c-${id}`; scored = false;
  } else if (q.nonce) {
    const nonce = String(q.nonce).slice(0, 16).replace(/[^a-z0-9]/g, '');
    if (!nonce) return res.status(400).json({ error: 'bad nonce' });
    key = `e-${mode}-${nonce}`; // encores score too — every win counts toward career
  } else {
    key = `${day}-${mode}` + (mode === 'ear' ? `-${tier}` : '');
  }

  let g = E.newGame(mode, scored);
  g.tier = tier;

  // scored ear daily: enforce the once-a-day lock from the profile (written once at settle)
  if (scored && mode === 'ear') {
    const prof = await E.readJSON(E.profileKey(token));
    const rec = prof && prof.results ? prof.results[key] : undefined;
    if (rec != null) g = E.gameFromResult(rec, tier);
  }

  const ctx = E.puzzleFor(key, g);
  if (!ctx || (ctx.mode === 'ear' && !ctx.piece)) return res.status(400).json({ error: 'bad puzzle' });

  const view = mode === 'ear' ? E.earView(ctx.piece, g) : E.factsView(ctx.composer, g, key);
  if (g.done && mode === 'ear') view.state.result.challengeId = E.assets(ctx.piece).id;

  res.setHeader('Cache-Control', 'no-store');
  res.json({ day, today, mode, tier, scored, key, gs: E.signGame(key, g), ...view });
};
