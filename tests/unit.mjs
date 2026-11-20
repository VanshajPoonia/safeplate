// Library behaviour that does not need the model: parsing, allergen names, result shape.
import assert from 'node:assert/strict';
import { createChecker, parseIngredients, resolveAllergens, familyKey, ALLERGENS } from '../lib/index.js';

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

// A stand-in embedder: one dimension per distinct text, so a text only matches itself.
function exactEmbed() {
  const ids = new Map();
  return async (texts) => texts.map((t) => {
    if (!ids.has(t)) ids.set(t, ids.size);
    const v = new Float32Array(512);
    v[ids.get(t)] = 1;
    return v;
  });
}

await test('parses a pasted list and strips quantities', () => {
  const got = parseIngredients('200 g labneh\n- 2 tbsp of finely chopped parsley, to taste; 1 can chickpeas');
  assert.deepEqual(got.map((i) => i.readAs), ['labneh', 'parsley', 'chickpeas']);
  assert.equal(got[0].text, '200 g labneh');
});

await test('leaves names that start like a unit alone', () => {
  const got = parseIngredients('gianduja\nlabneh\ngreen beans\nlemon\n3 cloves garlic\n1/2 cup milk');
  assert.deepEqual(got.map((i) => i.readAs), ['gianduja', 'labneh', 'green beans', 'lemon', 'garlic', 'milk']);
});

await test('treats each array item as one line', () => {
  const got = parseIngredients(['1 cup milk', '', '3 eggs']);
  assert.deepEqual(got.map((i) => i.readAs), ['milk', 'eggs']);
});

await test('resolves family keys, labels and aliases', () => {
  assert.equal(familyKey('dairy'), 'dairy');
  assert.equal(familyKey('Tree nuts'), 'treenut');
  assert.equal(familyKey('MILK'), 'dairy');
  assert.equal(familyKey('crustaceans'), 'shellfish');
  assert.equal(familyKey('mango'), null);
});

await test('keeps unknown names as custom terms with a severity', () => {
  const w = resolveAllergens(['sesame', { allergen: 'Mango', severity: 'anaphylactic' }], { dislikes: ['Olives'] });
  assert.deepEqual(w.families, [{ key: 'sesame', severity: 'anaphylactic' }]);
  assert.deepEqual(w.custom, [{ term: 'mango', severity: 'anaphylactic' }]);
  assert.deepEqual(w.dislikes, ['olives']);
});

await test('rejects an unknown severity', () => {
  assert.throws(() => resolveAllergens([{ allergen: 'dairy', severity: 'deadly' }]), /Unknown severity/);
});

await test('lists every family for callers', () => {
  assert.equal(ALLERGENS.length, 16);
  assert.ok(ALLERGENS.every((a) => a.key && a.label && a.severityDefault));
});

const checker = await createChecker({ embed: exactEmbed() });

await test('returns a verdict, the flagged allergens and one row per ingredient', async () => {
  const r = await checker.check('100 g casein\n1 carrot', ['dairy']);
  assert.equal(r.verdict, 'unsafe');
  assert.deepEqual(r.allergens, ['dairy']);
  assert.equal(r.ingredients.length, 2);
  const [casein, carrot] = r.ingredients;
  assert.equal(casein.flags[0].allergen, 'dairy');
  assert.equal(casein.flags[0].level, 'danger');
  assert.equal(casein.flags[0].matched, 'casein');
  assert.ok(casein.flags[0].reason.length > 0);
  assert.deepEqual(carrot.flags, []);
});

await test('excuses a false friend with its reason', async () => {
  const r = await checker.check('400 ml coconut milk', ['dairy']);
  assert.equal(r.verdict, 'safe');
  assert.equal(r.ingredients[0].excused[0].reason, 'Coconut milk contains no dairy.');
});

await test('softens the level for avoid-only severities', async () => {
  const r = await checker.check('bacon', [{ allergen: 'pork', severity: 'avoid' }]);
  assert.equal(r.ingredients[0].flags[0].level, 'avoid');
  assert.equal(r.verdict, 'avoid');
});

await test('needs at least one allergen', async () => {
  await assert.rejects(checker.check('milk', []), /at least one allergen/);
});

await test('handles an empty ingredient list', async () => {
  const r = await checker.check('', ['dairy']);
  assert.equal(r.verdict, 'safe');
  assert.deepEqual(r.ingredients, []);
});

if (failed) {
  console.error(`\n${failed} unit test(s) failed`);
  process.exit(1);
}
console.log('\nunit: PASS');
