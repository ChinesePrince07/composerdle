// POST /api/report {token, name} — report an objectionable stage name.
// Required by App Store guideline 1.2: stage names are user-generated content, so players
// need a way to flag one. The queue is reviewed in the admin panel, which can withdraw the
// name everywhere (E.clearName) or dismiss the report.
const E = require('./_engine.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const b = req.body || {};
  const token = E.cleanToken(b.token);
  const name = String(b.name || '').trim().slice(0, 24);
  if (!token || !name) return res.status(400).json({ error: 'bad request' });

  // Always answer ok: whether the name was already queued is not the reporter's business,
  // and a storage failure must not look like their report was refused.
  await E.addReport(name, token);
  res.status(200).json({ ok: true });
};
