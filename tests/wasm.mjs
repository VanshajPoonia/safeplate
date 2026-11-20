// The same eval on onnxruntime-web's WASM backend, the one the browser app runs.
// transformers.js only offers the native CPU backend in Node, so this wires WASM by hand.
import * as ort from 'onnxruntime-web';
import { AutoTokenizer, env } from '@huggingface/transformers';
import { createChecker, DEFAULT_MODEL } from '../lib/index.js';
import { loadModel } from '../lib/model.js';
import { evaluate } from './eval.mjs';

await loadModel(); // makes sure the q8 weights are in the local cache
const file = `${env.cacheDir}/${DEFAULT_MODEL}/onnx/model_quantized.onnx`;
ort.env.wasm.numThreads = 1; // GitHub Pages is not cross-origin isolated, so browsers get one thread
const session = await ort.InferenceSession.create(file, { executionProviders: ['wasm'] });
const tokenizer = await AutoTokenizer.from_pretrained(DEFAULT_MODEL);

async function embedOne(text) {
  const enc = tokenizer(text);
  const feeds = {};
  for (const name of session.inputNames) feeds[name] = new ort.Tensor('int64', enc[name].data, enc[name].dims);
  const { last_hidden_state: h } = await session.run(feeds);
  const [, n, d] = h.dims;
  const v = new Float32Array(d);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) v[j] += h.data[i * d + j] / n;
  const norm = Math.hypot(...v);
  return v.map((x) => x / norm);
}

const checker = await createChecker({
  embed: async (texts) => {
    const out = [];
    for (const t of texts) out.push(await embedOne(t));
    return out;
  },
});
await evaluate(checker, `model: ${DEFAULT_MODEL} (q8, onnxruntime-web wasm ${ort.env.versions.web})`);
