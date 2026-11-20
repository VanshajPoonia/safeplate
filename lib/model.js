// bge-small-en-v1.5, ~35 MB quantised, through transformers.js in a browser tab or in Node.
//
// Chosen over all-MiniLM-L6-v2 by measurement, not vibes. On tests/fixtures.js both
// models flag roughly the same number of real allergens once margin scoring is used
// (27 vs 29 of 30), but MiniLM produces 4 false alarms to bge-small's 1, and one of
// MiniLM's is danger-level ("buckwheat flour" read as gluten). In a tool someone trusts
// with an allergy, a confident wrong answer is the expensive failure.
export const DEFAULT_MODEL = 'Xenova/bge-small-en-v1.5';

const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';

export const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);

// Node resolves the npm package. Browsers load the same version from the CDN.
function importTransformers() {
  return isNode
    ? import('@huggingface/transformers')
    : import(/* @vite-ignore */ /* webpackIgnore: true */ CDN);
}

async function pickDevice(requested) {
  if (requested !== 'auto') return requested;
  if (isNode) return 'cpu';
  if (!globalThis.navigator?.gpu) return 'wasm';
  try {
    return (await navigator.gpu.requestAdapter()) ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

/**
 * Loads the model and returns { model, device, dtype, embed }. `embed(texts)` gives
 * mean-pooled, L2-normalised Float32Array vectors, one per text.
 */
export async function loadModel({ model = DEFAULT_MODEL, device = 'auto', dtype, cacheDir, onProgress } = {}) {
  const { pipeline, env } = await importTransformers();
  if (!isNode) {
    env.allowLocalModels = false;
    env.useBrowserCache = true;
  }
  if (cacheDir) env.cacheDir = cacheDir;
  const picked = await pickDevice(device);
  const type = dtype || (picked === 'webgpu' ? 'fp32' : 'q8');
  const extractor = await pipeline('feature-extraction', model, {
    device: picked,
    dtype: type,
    progress_callback: onProgress,
  });
  return {
    model,
    device: picked,
    dtype: type,
    // Quantised models scale activations per batch, so a batch shifts each vector by what
    // else is in it (cosine 0.997, measured). They get one text per pass. fp32 batches fine.
    async embed(texts) {
      const opts = { pooling: 'mean', normalize: true };
      if (type === 'fp32') return (await extractor(texts, opts)).tolist().map((row) => Float32Array.from(row));
      const vectors = [];
      for (const text of texts) vectors.push(Float32Array.from((await extractor(text, opts)).data));
      return vectors;
    },
  };
}
