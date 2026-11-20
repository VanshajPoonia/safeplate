// Scores a checker on the labelled fixtures and prints the numbers the README quotes.
import { FIXTURES, KNOWN_MISSES } from './fixtures.js';

export async function evaluate(checker, label) {
  console.log(label);
  let flagged = 0, clear = 0, excusedCount = 0;
  const missed = [], falseAlarms = [];

  for (const [ingredient, family, expected] of FIXTURES) {
    const { ingredients: [row] } = await checker.check(ingredient, [family]);
    const flag = row.flags[0];
    const excused = row.excused.length > 0;

    if (expected === 'HIT') {
      if (flag) flagged++;
      else missed.push(`${ingredient}${excused ? ' (excused)' : ''}`);
    } else if (flag) falseAlarms.push(`${ingredient} -> ${family} (${flag.level}, margin ${flag.margin.toFixed(2)})`);
    else if (excused) excusedCount++;
    else clear++;
  }

  const hits = FIXTURES.filter((f) => f[2] === 'HIT').length;
  const passes = FIXTURES.filter((f) => f[2] === 'PASS').length;

  console.log(`\nAllergens flagged:   ${flagged}/${hits}`);
  console.log(`Safe left clear:     ${clear}/${passes}`);
  console.log(`Excused by guard:    ${excusedCount}`);
  console.log(`Genuine false alarms:${falseAlarms.length}`);
  if (missed.length) console.log(`\nmissed: ${missed.join(', ')}`);
  if (falseAlarms.length) console.log(`false alarms: ${falseAlarms.join(', ')}`);

  // exitCode, not exit(): onnxruntime-node aborts on macOS if the process exits mid-teardown.
  const unexpectedMisses = missed.filter((m) => !KNOWN_MISSES.some((k) => m.startsWith(k)));
  if (unexpectedMisses.length) {
    console.error(`\nFAIL: ${unexpectedMisses.length} unexpected miss(es)`);
    process.exitCode = 1;
  } else if (falseAlarms.length > 2) {
    console.error(`\nFAIL: too many false alarms`);
    process.exitCode = 1;
  } else {
    console.log('\nPASS');
  }
}
