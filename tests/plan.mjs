// "Plan a week" with the README demo profile: which recipes the planner keeps, rules out
// or marks for checking, against hand labels in tests/fixtures.js.
import { readFile } from 'node:fs/promises';
import { createChecker } from '../lib/index.js';
import { scoreBank } from '../src/planner.js';
import { DEMO_PROFILE, RECIPE_TRUTH } from './fixtures.js';

const recipes = JSON.parse(await readFile(new URL('../data/recipes.json', import.meta.url), 'utf8'));
const checker = await createChecker();
const scored = await scoreBank(recipes, (lines) => checker.check(lines, DEMO_PROFILE));
const verdict = Object.fromEntries(scored.map((s) => [s.recipe.id, s.verdict]));
const count = (ids, v) => ids.filter((id) => verdict[id] === v).length;

const { contains, free } = RECIPE_TRUTH;
console.log(`Plan a week, ${DEMO_PROFILE.join(', ')}:`);
console.log(`  allergen-free recipes kept as safe: ${count(free, 'safe')}/${free.length}  (check ${count(free, 'check')}, ruled out ${count(free, 'unsafe')})`);
console.log(`  recipes with an allergen ruled out: ${count(contains, 'unsafe')}/${contains.length}  (check ${count(contains, 'check')}, passed as safe ${count(contains, 'safe')})`);
console.log(`  whole bank: ${['safe', 'check', 'unsafe'].map((v) => `${scored.filter((s) => s.verdict === v).length} ${v}`).join(', ')}`);

// Passing a recipe that contains an allergen as safe is the failure that must never happen.
if (count(contains, 'safe') > 0) {
  console.error('\nFAIL: a recipe with an allergen was passed as safe');
  process.exitCode = 1;
} else {
  console.log('\nplan: PASS');
}
