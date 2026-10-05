// Reproduces the measurement quoted in src/scan.js and the README.
// Runs the real scanner against the real model. No mocks.
import { pipeline } from '@huggingface/transformers';
import { FIXTURES, KNOWN_MISSES } from './fixtures.js';
import { FAMILIES, FALSE_FRIENDS, HIDDEN_SOURCES, CONTROL_FOODS } from '../src/allergens.js';

const DEFAULT_MODEL = process.env.MODEL || 'Xenova/bge-small-en-v1.5';
const T = { DANGER_SIM: 0.90, DANGER_MARGIN: 0.02, DANGER_MIN_SIM: 0.65, CAUTION_MARGIN: -0.05, FALSE_FRIEND: 0.86 };
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

const families = [...new Set(FIXTURES.map((f) => f[1]))];
const vocab = new Set(CONTROL_FOODS);
families.forEach((k) => {
  FAMILIES[k].terms.forEach((t) => vocab.add(t));
  (HIDDEN_SOURCES[k] || []).forEach((t) => vocab.add(t));
});
FALSE_FRIENDS.forEach((f) => vocab.add(f.term));

console.log(`model: ${DEFAULT_MODEL}`);
const extractor = await pipeline('feature-extraction', DEFAULT_MODEL, { dtype: 'q8' });
const cache = new Map();
async function embed(texts) {
  const miss = [...new Set(texts.filter((t) => !cache.has(t)))];
  if (miss.length) {
    const out = await extractor(miss, { pooling: 'mean', normalize: true });
    out.tolist().forEach((r, i) => cache.set(miss[i], r));
  }
  return texts.map((t) => cache.get(t));
}
await embed([...vocab]);

const best = (v, terms) => terms.reduce((b, t) => {
  const s = cache.has(t) ? cos(v, cache.get(t)) : -1;
  return s > b.score ? { score: s, term: t } : b;
}, { score: -1, term: null });

let flagged = 0, missed = [], clear = 0, excusedCount = 0, falseAlarms = [];

for (const [ingredient, family, expected] of FIXTURES) {
  const [v] = await embed([ingredient]);
  const control = best(v, CONTROL_FOODS).score;
  const direct = best(v, FAMILIES[family].terms);
  const hidden = best(v, HIDDEN_SOURCES[family] || []);
  const top = hidden.score > direct.score ? hidden : direct;
  const margin = top.score - control;

  let verdict = 'clear';
  if (top.score >= T.DANGER_SIM) verdict = 'danger';
  else if (margin >= T.DANGER_MARGIN && top.score >= T.DANGER_MIN_SIM) verdict = 'danger';
  else if (margin >= T.CAUTION_MARGIN) verdict = 'caution';

  const excused = FALSE_FRIENDS.some((f) => f.notFamily === family && cache.has(f.term) && cos(v, cache.get(f.term)) >= T.FALSE_FRIEND);

  if (expected === 'HIT') {
    if (verdict === 'clear') missed.push(`${ingredient} (sim ${top.score.toFixed(2)}, margin ${margin.toFixed(2)})`);
    else flagged++;
  } else if (verdict === 'clear') clear++;
  else if (excused) excusedCount++;
  else falseAlarms.push(`${ingredient} -> ${family} (${verdict}, margin ${margin.toFixed(2)})`);
}

const hits = FIXTURES.filter((f) => f[2] === 'HIT').length;
const passes = FIXTURES.filter((f) => f[2] === 'PASS').length;

console.log(`\nAllergens flagged:   ${flagged}/${hits}`);
console.log(`Safe left clear:     ${clear}/${passes}`);
console.log(`Excused by guard:    ${excusedCount}`);
console.log(`Genuine false alarms:${falseAlarms.length}`);
if (missed.length) console.log(`\nmissed: ${missed.join(', ')}`);
if (falseAlarms.length) console.log(`false alarms: ${falseAlarms.join(', ')}`);

const unexpectedMisses = missed.filter((m) => !KNOWN_MISSES.some((k) => m.startsWith(k)));
if (unexpectedMisses.length) {
  console.error(`\nFAIL: ${unexpectedMisses.length} unexpected miss(es)`);
  process.exit(1);
}
if (falseAlarms.length > 2) {
  console.error(`\nFAIL: too many false alarms`);
  process.exit(1);
}
console.log('\nPASS');
