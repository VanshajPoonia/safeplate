// Every flag must say why, in plain words. Checks the facts table, then real reasons.
import assert from 'node:assert/strict';
import { FAMILIES, HIDDEN_SOURCES, createChecker } from '../lib/index.js';
import { NOTES } from '../lib/vocabulary.js';

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}\n     ${err.message}`);
  }
}

await test('every seed term and hidden source has a fact', () => {
  const missing = [];
  for (const [key, family] of Object.entries(FAMILIES)) {
    for (const term of [...family.terms, ...(HIDDEN_SOURCES[key] || [])]) {
      if (!NOTES[key]?.[term]) missing.push(`${key}: ${term}`);
    }
  }
  assert.deepEqual(missing, []);
});

await test('no fact is orphaned or badly written', () => {
  for (const [key, notes] of Object.entries(NOTES)) {
    const terms = new Set([...FAMILIES[key].terms, ...(HIDDEN_SOURCES[key] || [])]);
    for (const [term, note] of Object.entries(notes)) {
      assert.ok(terms.has(term), `${key}: "${term}" is not a seed term`);
      assert.match(note, /^[A-Z].*\.$/, `${key}: "${note}" should be one plain sentence`);
      assert.ok(!note.includes('—'), `${key}: "${note}" has an em dash`);
    }
  }
});

// A stand-in embedder where a text only matches itself, so every match is exact.
function exactEmbed() {
  const ids = new Map();
  return async (texts) => texts.map((t) => {
    if (!ids.has(t)) ids.set(t, ids.size);
    const v = new Float32Array(512);
    v[ids.get(t)] = 1;
    return v;
  });
}
const exact = await createChecker({ embed: exactEmbed() });

await test('an exact match gives the fact on its own', async () => {
  const r = await exact.check('casein', ['dairy']);
  assert.equal(r.ingredients[0].flags[0].reason, 'Casein is a milk protein.');
});

await test('a hidden source says to check the label', async () => {
  const r = await exact.check('worcestershire sauce', ['fish']);
  assert.equal(r.ingredients[0].flags[0].reason, 'Worcestershire sauce contains anchovies.');
  const s = await exact.check('burger bun', ['sesame']);
  assert.equal(s.ingredients[0].flags[0].reason, 'Burger buns are often topped with sesame seeds. Check the label.');
});

await test('custom terms and dislikes explain themselves', async () => {
  const r = await exact.check('mango\nolives', ['mango'], { dislikes: ['olives'] });
  assert.equal(r.ingredients[0].flags[0].reason, 'Mango is on your list.');
  const dislike = r.ingredients[1].flags.find((f) => f.level === 'dislike');
  assert.equal(dislike.reason, 'Matches olives, which they dislike. Not an allergy.');
});

const real = await createChecker();
const HARD = ['200 g labneh', 'a handful of kataifi pastry', '150 g surimi sticks', '2 tbsp gomasio',
  '100 g panko breadcrumbs', '2 tbsp light soy sauce', '1 tsp sodium caseinate', 'casein'];
const FAMS = ['dairy', 'gluten', 'sesame', 'shellfish', 'treenut', 'fish', 'egg'];
const result = await real.check(HARD, FAMS);
const flagFor = (text, allergen) => result.ingredients.find((i) => i.text === text).flags.find((f) => f.allergen === allergen);

await test('every real flag carries the fact for what it matched', () => {
  for (const ing of result.ingredients) {
    for (const f of ing.flags) {
      assert.ok(f.reason.includes(NOTES[f.allergen][f.matched]), `${ing.text} / ${f.allergen}: ${f.reason}`);
    }
  }
});

await test('the hard examples get the reasons a cook needs', () => {
  assert.equal(flagFor('casein', 'dairy').reason, 'Casein is a milk protein.');
  assert.equal(flagFor('2 tbsp light soy sauce', 'gluten').reason,
    'Close in meaning to soy sauce. Soy sauce is usually brewed with wheat.');
  assert.equal(flagFor('150 g surimi sticks', 'shellfish').reason,
    'Close in meaning to surimi. Surimi is fish paste that often contains crab extract.');
  assert.equal(flagFor('2 tbsp gomasio', 'sesame').reason,
    'Close in meaning to gomashio. Gomashio is toasted sesame seeds with salt.');
  assert.match(flagFor('1 tsp sodium caseinate', 'dairy').reason, /Casein is a milk protein\. Worth checking the label\.$/);
});

await test('a false friend is excused with its reason', async () => {
  const r = await real.check('400 ml coconut milk\n2 tsp nutmeg', ['dairy', 'treenut']);
  assert.deepEqual(r.ingredients[0].flags, []);
  assert.equal(r.ingredients[1].excused[0].reason, 'A seed spice, not a tree nut.');
});

if (failed) {
  console.error(`\n${failed} reason test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('\nreasons: PASS');
}
