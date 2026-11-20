// lib/vectors.js must match the vocabulary and what the model gives today.
// If this fails after a vocabulary change, run `npm run vectors`.
import assert from 'node:assert/strict';
import pre from '../lib/vectors.js';
import { SEED_TERMS, DEFAULT_MODEL } from '../lib/index.js';
import { loadModel } from '../lib/model.js';

assert.equal(pre.model, DEFAULT_MODEL);
assert.equal(pre.dtype, 'q8');
assert.deepEqual(pre.terms, [...SEED_TERMS].sort(), 'lib/vectors.js is stale. Run npm run vectors.');

const all = new Float32Array(Uint8Array.from(atob(pre.data), (c) => c.charCodeAt(0)).buffer);
const engine = await loadModel();
const fresh = await engine.embed(pre.terms);
let worst = 0;
fresh.forEach((v, i) => v.forEach((x, j) => { worst = Math.max(worst, Math.abs(x - all[i * pre.dims + j])); }));
assert.ok(worst < 1e-5, `precomputed vectors drift from the model by ${worst}`);
console.log(`vectors: PASS (${pre.terms.length} terms, max drift ${worst.toExponential(1)})`);
