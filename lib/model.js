// bge-small-en-v1.5, ~35 MB quantised, through transformers.js in a browser tab or in Node.
//
// Chosen over all-MiniLM-L6-v2 by measurement. On tests/fixtures.js MiniLM flags 26 of 30
// with 3 false alarms, one of them danger-level ("buckwheat flour" read as gluten).
// bge-small flags 29 of 30 with 1 soft false alarm. In a tool someone trusts with an
// allergy, a confident wrong answer is the expensive failure.
export const DEFAULT_MODEL = 'Xenova/bge-small-en-v1.5';

const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';

export const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);

// Node resolves the npm package. Browsers load the same version from the CDN.
function importTransformers() {
  return isNode
    ? import('@huggingface/transformers')
    : import(/* @vite-ignore */ /* webpackIgnore: true */ CDN);
}

/**
 * Loads the model and returns { model, device, dtype, embed }. `embed(texts)` gives
 * mean-pooled, L2-normalised Float32Array vectors, one per text.
 *
 * Defaults to q8 on the CPU (Node) or WASM (browser), the setup tests/run.mjs measures.
 * fp32, which the app used on WebGPU before, scored 3 false alarms (one danger-level) to q8's 1.
 */
export async function loadModel({ model = DEFAULT_MODEL, device, dtype = 'q8', cacheDir, onProgress } = {}) {
  const { pipeline, env } = await importTransformers();
  if (!isNode) {
    env.allowLocalModels = false;
    env.useBrowserCache = true;
  }
  if (cacheDir) env.cacheDir = cacheDir;
  const picked = device || (isNode ? 'cpu' : 'wasm');
  const extractor = await pipeline('feature-extraction', model, {
    device: picked,
    dtype,
    progress_callback: onProgress,
  });
  return {
    model,
    device: picked,
    dtype,
    // Quantised models scale activations per batch, so a batch shifts each vector by what
    // else is in it (cosine 0.997, measured). They get one text per pass. fp32 batches fine.
    async embed(texts) {
      const opts = { pooling: 'mean', normalize: true };
      if (dtype === 'fp32') return (await extractor(texts, opts)).tolist().map((row) => Float32Array.from(row));
      const vectors = [];
      for (const text of texts) vectors.push(Float32Array.from((await extractor(text, opts)).data));
      return vectors;
    },
  };
}
