// How noisy is a check that watches many allergens at once? The fixture eval checks one
// family per ingredient. A menu tool checks all of them. This counts flags on EVERYDAY.
import { createChecker } from '../lib/index.js';
import { EVERYDAY, MAJOR_NINE } from './fixtures.js';

// Measured 2026-11-22 with the food list (model only: 28 and 1, and 7 danger before the danger
// margin went to 0.09). Lower these when the matcher improves, never raise them.
const CEILING = { anyFlag: 4, danger: 0 };

const checker = await createChecker();
let anyFlag = 0, cautionFlags = 0;
const dangers = [];
for (const ingredient of EVERYDAY) {
  const { flags } = (await checker.check(ingredient, MAJOR_NINE)).ingredients[0];
  if (flags.length) anyFlag++;
  cautionFlags += flags.filter((f) => f.level === 'caution').length;
  const bad = flags.filter((f) => f.level === 'danger').map((f) => f.allergen);
  if (bad.length) dangers.push(`${ingredient} -> ${bad.join(', ')}`);
}

console.log(`Everyday ingredients, checked against the nine major allergens at once:`);
console.log(`  with any flag:        ${anyFlag}/${EVERYDAY.length}`);
console.log(`  with a danger flag:   ${dangers.length}/${EVERYDAY.length}  (${dangers.join('; ')})`);
console.log(`  caution flags total:  ${cautionFlags}`);
if (anyFlag > CEILING.anyFlag || dangers.length > CEILING.danger) {
  console.error('\nFAIL: noisier than the last measurement');
  process.exitCode = 1;
} else {
  console.log('\nnoise: PASS (no worse than measured)');
}
