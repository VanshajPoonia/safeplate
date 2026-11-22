// The curated food list must be well formed and agree with the library's own vocabulary.
import assert from 'node:assert/strict';
import { FAMILIES, HIDDEN_SOURCES, FALSE_FRIENDS } from '../lib/vocabulary.js';
import { KNOWN_FOODS, FAMILY_WORDS, findKnown } from '../lib/known.js';

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

await test('every row names real families, each once', () => {
  for (const food of KNOWN_FOODS) {
    for (const f of [...food.contains, ...food.may]) assert.ok(FAMILIES[f], `${food.name}: unknown family ${f}`);
    assert.deepEqual(food.contains.filter((f) => food.may.includes(f)), [], `${food.name}: in contains and may`);
  }
  assert.deepEqual(Object.keys(FAMILY_WORDS).sort(), Object.keys(FAMILIES).sort());
});

await test('no name is listed twice', () => {
  const names = KNOWN_FOODS.flatMap((f) => f.names);
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
});

await test('a listed seed term or hidden source keeps its family', () => {
  const wrong = [];
  for (const [key, family] of Object.entries(FAMILIES)) {
    for (const term of [...family.terms, ...(HIDDEN_SOURCES[key] || [])]) {
      const food = findKnown(term);
      if (food && !food.contains.includes(key) && !food.may.includes(key)) wrong.push(`${term} (${key})`);
    }
  }
  assert.deepEqual(wrong, []);
});

await test('a listed false friend is not said to contain that family', () => {
  for (const ff of FALSE_FRIENDS) {
    const food = findKnown(ff.term);
    if (food) assert.ok(!food.contains.includes(ff.notFamily), `${ff.term} contains ${ff.notFamily}`);
  }
});

await test('notes are plain sentences', () => {
  for (const { name, note } of KNOWN_FOODS.filter((f) => f.note)) {
    assert.match(note, /^[A-Z].*\.$/, name);
    assert.ok(!note.includes('—'), name);
  }
});

await test('plurals and singulars find the same row', () => {
  assert.equal(findKnown('tomatoes').name, 'tomato');
  assert.equal(findKnown('blueberry').name, 'blueberries');
  assert.equal(findKnown('cashew').name, 'cashews');
  assert.equal(findKnown('gianduja'), null);
});

if (failed) {
  console.error(`\n${failed} known-food test(s) failed`);
  process.exitCode = 1;
} else {
  console.log(`\nknown: PASS (${KNOWN_FOODS.length} foods)`);
}
