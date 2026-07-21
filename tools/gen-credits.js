// Regenerate credits.html from the live piece data so it never falls out of sync.
// Run: node tools/gen-credits.js
const fs = require('fs');
const path = require('path');
const { PIECES } = require('../api/_pieces.js');

const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const all = [].concat(PIECES.easy, PIECES.medium, PIECES.hard)
  .sort((a, b) => a.composer.localeCompare(b.composer) || a.title.localeCompare(b.title));

const rows = all.map(p =>
  `<tr><td>${esc(p.composer)}</td><td>${esc(p.title)}</td><td>${esc(p.performer)} (${esc(p.license)})</td><td>${esc(p.scoreNote)}</td></tr>`
).join('');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Composerdle · Credits</title><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Spectral:wght@300;400&display=swap" rel="stylesheet"><style>body{font-family:Spectral,Georgia,serif;background:#f5eddb;color:#211c12;padding:32px 16px;max-width:900px;margin:0 auto}h1{font-family:"Cormorant Garamond",serif;letter-spacing:.1em;text-transform:uppercase;text-align:center}.ack{text-align:center;font-size:18px;background:#fbf5e7;border:1px solid #9a7724;padding:16px 20px;margin:20px 0}p{font-style:italic;color:#5c5137;text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:14px}td,th{padding:8px 10px;border-bottom:1px dotted #b3a37e;text-align:left;vertical-align:top}th{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#7c2323}a{color:#7c2323}</style></head><body><h1>Credits</h1><div class="ack">Composerdle is a fan-made daily guessing game for classical-music lovers. Every recording and score below is public domain or Creative Commons — attribution is our way of saying thank you to the performers and libraries who made them free.</div><p>Every recording and score is public domain or Creative Commons.<br>Sources: Wikimedia Commons, Musopen, Internet Archive, BnF Gallica, IMSLP.<br>Rights concerns? Reach out via the project&#39;s repository · <a href="index.html">back to the game</a></p><table><tr><th>Composer</th><th>Work</th><th>Recording</th><th>Score edition</th></tr>${rows}</table></body></html>`;

fs.writeFileSync(path.join(__dirname, '..', 'credits.html'), html);
console.log(`credits.html regenerated — ${all.length} pieces`);
