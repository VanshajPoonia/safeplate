// Picks the thresholds from tests/multi-fixtures.js MULTI_TUNE only. The held-out set is not
// read here. The single-family recall set in tests/fixtures.js is a guard, not a target.
// node scripts/tune.mjs
import { createChecker, THRESHOLDS } from '../lib/index.js';
import { loadModel } from '../lib/model.js';
import { scoreMulti } from '../tests/multi.mjs';
import { MULTI_TUNE } from '../tests/multi-fixtures.js';
import { FIXTURES } from '../tests/fixtures.js';

const engine = await loadModel();
const cache = new Map();
async function embed(texts) {
  const missing = texts.filter((t) => !cache.has(t));
  if (missing.length) (await engine.embed(missing)).forEach((v, i) => cache.set(missing[i], v));
  return texts.map((t) => cache.get(t));
}

async function guard(checker) {
  let hits = 0, alarms = 0;
  for (const [ingredient, family, expected] of FIXTURES) {
    const flagged = (await checker.check(ingredient, [family])).ingredients[0].flags.length > 0;
    if (expected === 'HIT') hits += flagged;
    else alarms += flagged;
  }
  return { hits, alarms };
}

async function measure(thresholds) {
  const checker = await createChecker({ embed, precomputed: true, thresholds });
  return { thresholds, guard: await guard(checker), tune: await scoreMulti(checker, MULTI_TUNE) };
}

const before = await measure({});
const results = [];
for (const CAUTION_MARGIN of [-0.05, -0.04, -0.03, -0.02, -0.01, 0]) {
  for (let DANGER_MARGIN = 0.02; DANGER_MARGIN <= 0.1501; DANGER_MARGIN += 0.01) {
    for (const DANGER_MIN_SIM of [0.55, 0.58, 0.6, 0.62, 0.65, 0.68]) {
      results.push(await measure({ CAUTION_MARGIN, DANGER_MARGIN: +DANGER_MARGIN.toFixed(2), DANGER_MIN_SIM }));
    }
  }
}

// Keep the guard where it is, lose no recall on the tune set, then cut danger false alarms.
const ok = results.filter((r) => r.guard.hits >= before.guard.hits && r.guard.alarms <= before.guard.alarms
  && r.tune.caught >= before.tune.caught && r.tune.caughtStrong >= before.tune.caughtStrong);
ok.sort((a, b) => a.tune.strongAlarms - b.tune.strongAlarms || b.tune.caughtStrong - a.tune.caughtStrong
  || a.tune.alarms - b.tune.alarms);

const line = (r) => `${JSON.stringify(r.thresholds)} guard ${r.guard.hits}/30 hit ${r.guard.alarms} alarm, `
  + `tune caught ${r.tune.caught} (${r.tune.caughtStrong} strong), alarms ${r.tune.alarms} (${r.tune.strongAlarms} strong)`;
console.log(`current ${line(before)}`);
console.log(`${results.length} settings tried, ${ok.length} keep the guard and the recall. Best five:`);
ok.slice(0, 5).forEach((r) => console.log(`  ${line(r)}`));
const moved = results.filter((r) => r.thresholds.CAUTION_MARGIN > THRESHOLDS.CAUTION_MARGIN && r.guard.hits >= 29);
console.log(`settings with a stricter caution margin that keep 29/30 on the guard: ${moved.length}`);
