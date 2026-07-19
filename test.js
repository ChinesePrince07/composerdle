// ponytail: single self-check for game logic — run `node test.js`
const assert = require('assert');
const { COMPOSERS, norm, aliases, matchGuess, dailyIndex } = require('./api/_game.js');

// data integrity: 6 facts each, no fact leaks the surname
for (const c of COMPOSERS) {
  assert.strictEqual(c.facts.length, 6, `${c.name}: needs 6 facts`);
  const last = norm(c.name.split(' ').pop());
  c.facts.slice(0, 5).forEach((f, i) =>
    assert(!norm(f).includes(last), `${c.name}: clue ${i + 1} leaks surname`));
}

// expanded fact bank: 9 per composer, ordered cryptic→giveaway, no early surname leaks
const E = require('./api/_engine.js');
for (const c of COMPOSERS) {
  assert.strictEqual(c.facts9.length, 9, `${c.name}: needs 9 merged facts`);
  const last = norm(c.name.split(' ').pop());
  c.facts9.slice(0, 8).forEach((f, i) =>
    assert(!norm(f).includes(last), `${c.name}: fact9[${i}] leaks surname`));
}
// seeded clue hands: deterministic, 6 unique ascending-ish, finale from the two easiest, varies by key
{
  const a = E.factIndices('42-facts'), b = E.factIndices('42-facts');
  assert.deepStrictEqual(a, b, 'fact hand must be deterministic per key');
  assert.strictEqual(new Set(a).size, 6, 'six unique facts');
  assert(a[5] === 7 || a[5] === 8, 'finale must be a giveaway fact');
  for (let i = 1; i < 5; i++) assert(a[i] > a[i - 1], 'clues must get progressively easier');
  const differs = ['1-facts', '2-facts', '3-facts', '4-facts'].map(k => E.factIndices(k).join());
  assert(new Set(differs).size > 1, 'different keys should deal different hands');
  // difficulty tiers draw from difficulty-appropriate fact windows
  for (const k of ['a', 'b', 'c', 'd', 'e']) {
    const hard = E.factIndices(k + '-hard', 'hard');
    assert(hard.every(i => i <= 6), `hard must never show a giveaway fact (7,8): ${hard}`);
    assert.strictEqual(new Set(hard).size, 6, 'hard still deals 6 unique');
    const easy = E.factIndices(k + '-easy', 'easy');
    assert(easy.every(i => i >= 2), `easy must skip the most cryptic facts (0,1): ${easy}`);
    assert(easy[5] === 7 || easy[5] === 8, 'easy finale names the works');
  }
}

// no alias collisions between composers — except surnames genuinely shared by two composers
// (e.g. Johann vs Richard Strauss). The day's target is always known, so a bare surname is
// only ever checked against it; the collision merely picks which name shows in a "wrong" strike.
const SHARED_SURNAMES = new Set(['strauss', 'schumann']);
const seen = new Map();
for (const c of COMPOSERS) for (const a of aliases(c)) {
  assert(SHARED_SURNAMES.has(a) || !seen.has(a) || seen.get(a) === c.name, `alias collision: "${a}" (${seen.get(a)} vs ${c.name})`);
  seen.set(a, c.name);
}

// matching: full name, surname, case/diacritics/spacing, alt spellings
const by = n => COMPOSERS.find(c => c.name.includes(n));
assert(matchGuess('Johann Sebastian Bach', by('Bach')));
assert(matchGuess('bach', by('Bach')));
assert(matchGuess('  BEETHOVEN ', by('Beethoven')));
assert(matchGuess('van Beethoven', by('Beethoven')));
assert(matchGuess('Dvorak', by('Dvořák')));
assert(matchGuess('Dvořák', by('Dvořák')));
assert(matchGuess('Saint Saens', by('Saint-Saëns')));
assert(matchGuess('rachmaninov', by('Rachmaninoff')));
assert(matchGuess('Chaikovsky', by('Tchaikovsky')));
assert(!matchGuess('Mozart', by('Beethoven')));
assert(!matchGuess('', by('Bach')));
assert(!matchGuess('Sergei', by('Prokofiev')), 'bare first name must not match');

// daily pick: deterministic, in range, varies day to day
const d1 = new Date(2026, 6, 17), d2 = new Date(2026, 6, 18);
assert.strictEqual(dailyIndex(d1), dailyIndex(new Date(2026, 6, 17, 23, 59)));
assert(dailyIndex(d1) >= 0 && dailyIndex(d1) < COMPOSERS.length);
assert.notStrictEqual(dailyIndex(d1), dailyIndex(d2));
// stride 17 is coprime with pool size → full rotation before repeats
const cycle = new Set();
for (let i = 0; i < COMPOSERS.length; i++) cycle.add(dailyIndex(new Date(2026, 0, 1 + i)));
assert.strictEqual(cycle.size, COMPOSERS.length, 'daily cycle must cover every composer');

// mode II pieces: valid composer, https assets, sane crop, full credits — per tier
const { PIECES, pieceIndex } = require('./api/_pieces.js');
assert(PIECES.easy.length >= 8, 'easy tier too small');
let pieceCount = 0;
for (const [tier, pool] of Object.entries(PIECES)) {
  for (const p of pool) {
    pieceCount++;
    const c = COMPOSERS.find(c => c.name === p.composer);
    assert(c, `${tier}/${p.title}: composer not in pool`);
    assert(p.audio.startsWith('https://'), `${tier}/${p.title}: bad audio url`);
    assert(Array.isArray(p.pages) && p.pages.length >= 1, `${tier}/${p.title}: needs score pages`);
    p.pages.forEach(u => {
      if (u.startsWith('scores/')) assert(require('fs').existsSync(__dirname + '/' + u), `${tier}/${p.title}: missing local page ${u}`);
      else assert(u.startsWith('https://'), `${tier}/${p.title}: bad page url`);
    });
    assert(p.crop >= 0 && p.crop < 0.5, `${tier}/${p.title}: crop out of range`);
    assert(p.performer && p.license && p.scoreNote, `${tier}/${p.title}: missing credits`);
    assert(p.year > 1600 && p.year < 1930, `${tier}/${p.title}: missing/bad year`);
    assert(p.genre && p.genreWords.length && p.keys.length, `${tier}/${p.title}: missing guess metadata`);
  }
  if (!pool.length) continue;
  assert.strictEqual(pieceIndex(d1, pool), pieceIndex(new Date(2026, 6, 17, 23, 59), pool));
  const pcycle = new Set();
  for (let i = 0; i < pool.length; i++) pcycle.add(pieceIndex(new Date(2026, 0, 1 + i), pool));
  assert.strictEqual(pcycle.size, pool.length, `${tier}: daily cycle must cover every piece`);
}

// piece-name matching (mirror of listen.html normP)
const normP = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]/g, '').replace(/no(?=\d)/g, '');
const pieceBy = t => Object.values(PIECES).flat().find(p => p.title.includes(t));
const hits = (g, p) => p.keys.some(k => normP(g).includes(k));
assert(hits('Symphony No. 5', pieceBy('Op. 67')), 'symphony no 5 should match Beethoven 5');
assert(!hits('Symphony No. 9', pieceBy('Op. 67')), 'symphony no 9 must not match Beethoven 5');
assert(pieceBy('Op. 67').genreWords.some(w => normP('symphony no 9').includes(normP(w))), 'symphony no 9 is right genre for Beethoven 5');
assert(hits('The Four Seasons spring', pieceBy('Spring')), 'four seasons matches Spring');
assert(hits('funeral march', pieceBy('Marche')), 'funeral march matches Chopin');
assert(hits('in the hall of the mountain king', pieceBy('Mountain King')), 'mountain king matches');

console.log(`ok — ${COMPOSERS.length} composers, ${pieceCount} pieces across ${Object.keys(PIECES).length} tiers, all checks passed`);
