// Checks each labelled ingredient against all 16 families at once, the way a menu tool
// would, and scores the flags against the labels in tests/multi-fixtures.js.
import { pathToFileURL } from 'node:url';
import { createChecker, FAMILIES } from '../lib/index.js';
import { MULTI_TUNE, MULTI_HELDOUT } from './multi-fixtures.js';

const ALL = Object.keys(FAMILIES);
const STRONG = new Set(['danger', 'avoid']);

/** Recall and false alarms of a checker on labelled rows. */
export async function scoreMulti(checker, rows) {
  const s = { contains: 0, caught: 0, caughtStrong: 0, absent: 0, alarms: 0, strongAlarms: 0, missed: [], strong: [] };
  for (const [ingredient, contains, maybe = []] of rows) {
    const { flags } = (await checker.check(ingredient, ALL)).ingredients[0];
    const level = new Map(flags.map((f) => [f.allergen, f.level]));
    for (const family of ALL) {
      if (maybe.includes(family)) continue;
      const got = level.get(family);
      if (contains.includes(family)) {
        s.contains++;
        if (got) s.caught++;
        else s.missed.push(`${ingredient}/${family}`);
        if (STRONG.has(got)) s.caughtStrong++;
      } else {
        s.absent++;
        if (got) s.alarms++;
        if (STRONG.has(got)) {
          s.strongAlarms++;
          s.strong.push(`${ingredient}/${family}`);
        }
      }
    }
  }
  return s;
}

export function describe(name, s) {
  const pct = (a, b) => `${a}/${b} (${Math.round((100 * a) / b)}%)`;
  return [
    `${name}`,
    `  allergens caught:          ${pct(s.caught, s.contains)}`,
    `  caught as danger or avoid: ${pct(s.caughtStrong, s.contains)}`,
    `  false alarms, any level:   ${pct(s.alarms, s.absent)}`,
    `  false alarms, danger/avoid:${pct(s.strongAlarms, s.absent)}`,
  ].join('\n');
}

// Measured 2026-11-21. Recall may not fall below these and false alarms may not rise above.
const FLOOR = { tune: { caught: 114, caughtStrong: 29 }, held: { caught: 115, caughtStrong: 30 } };
const CEILING = { tune: { strongAlarms: 66 }, held: { strongAlarms: 67 } };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checker = await createChecker();
  const sets = { tune: await scoreMulti(checker, MULTI_TUNE), held: await scoreMulti(checker, MULTI_HELDOUT) };
  console.log(describe(`Tune set, ${MULTI_TUNE.length} ingredients x 16 families`, sets.tune));
  console.log(describe(`Held-out set, ${MULTI_HELDOUT.length} ingredients x 16 families`, sets.held));
  if (process.env.VERBOSE) {
    console.log('\nheld-out misses:', sets.held.missed.join(', '));
    console.log('held-out strong false alarms:', sets.held.strong.join(', '));
  }
  const worse = Object.entries(sets).flatMap(([name, s]) => [
    ...Object.entries(FLOOR[name]).filter(([k, v]) => s[k] < v).map(([k]) => `${name} ${k}`),
    ...Object.entries(CEILING[name]).filter(([k, v]) => s[k] > v).map(([k]) => `${name} ${k}`),
  ]);
  if (worse.length) {
    console.error(`\nFAIL: worse than measured: ${worse.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('\nmulti: PASS (no worse than measured)');
  }
}
