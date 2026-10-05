// bge-small-en-v1.5, ~35 MB quantised, running in this tab.
//
// Chosen over all-MiniLM-L6-v2 by measurement, not vibes. On tests/fixtures.js both
// models flag roughly the same number of real allergens once margin scoring is used
// (27 vs 29 of 30), but MiniLM produces 4 false alarms to bge-small's 1 — and one of
// MiniLM's is danger-level ("buckwheat flour" read as gluten). In a tool someone trusts
// with an allergy, a confident wrong answer is the expensive failure. Run `npm test`,
// or `MODEL=Xenova/all-MiniLM-L6-v2 npm test`, to reproduce both.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';

env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor = null;
let loadedKey = '';
const cache = new Map(); // text -> Float32Array, so the allergen vocabulary embeds once

export function ready() {
  return extractor !== null;
}

async function pickDevice(requested) {
  if (requested !== 'auto') return requested;
  if (!('gpu' in navigator)) return 'wasm';
  try {
    return (await navigator.gpu.requestAdapter()) ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

export const DEFAULT_MODEL = 'Xenova/bge-small-en-v1.5';

export async function load(modelId = DEFAULT_MODEL, requestedDevice = 'auto', onProgress) {
  const device = await pickDevice(requestedDevice);
  const key = `${modelId}|${device}`;
  if (extractor && loadedKey === key) return { device, reused: true };
  extractor = await pipeline('feature-extraction', modelId, {
    device,
    dtype: device === 'webgpu' ? 'fp32' : 'q8',
    progress_callback: onProgress,
  });
  loadedKey = key;
  cache.clear();
  return { device, reused: false };
}

/** Mean-pooled, L2-normalised sentence embeddings. Cached by exact string. */
export async function embed(texts) {
  if (!extractor) throw new Error('Embedding model not loaded.');
  const list = Array.isArray(texts) ? texts : [texts];
  const missing = [...new Set(list.filter((t) => !cache.has(t)))];

  if (missing.length) {
    const out = await extractor(missing, { pooling: 'mean', normalize: true });
    const rows = out.tolist();
    missing.forEach((t, i) => cache.set(t, Float32Array.from(rows[i])));
  }
  return list.map((t) => cache.get(t));
}

/** Both vectors are already normalised, so the dot product is the cosine. */
export function cosine(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function cacheSize() {
  return cache.size;
}
