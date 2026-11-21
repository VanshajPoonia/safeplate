import { FAMILIES, SEVERITY, FALSE_FRIENDS, HIDDEN_SOURCES, CONTROL_FOODS } from './vocabulary.js';
import { parseIngredients, resolveAllergens, vocabularyFor, scoreIngredient, overallVerdict, flaggedAllergens, THRESHOLDS } from './match.js';
import { loadModel, DEFAULT_MODEL } from './model.js';

export { FAMILIES, SEVERITY, FALSE_FRIENDS, HIDDEN_SOURCES, CONTROL_FOODS } from './vocabulary.js';
export { THRESHOLDS, normalizeIngredient, parseIngredients, resolveAllergens, familyKey } from './match.js';
export { DEFAULT_MODEL } from './model.js';

/** Sent with every result. Show it wherever the result is shown. */
export const DISCLAIMER = 'SafePlate is a warning aid. It is not a guarantee and not medical advice. '
  + 'It can miss an allergen, and it cannot see cross-contact, shared equipment or recipe changes. '
  + 'A clear result does not mean a dish is safe. Check the label and ask the kitchen.';

/** The allergen families a caller can ask for, by key. */
export const ALLERGENS = Object.entries(FAMILIES).map(([key, f]) => ({
  key, label: f.label, severityDefault: f.severityDefault,
}));

// Seed terms live for the life of a checker. Ingredient vectors are dropped in bulk past this.
const MAX_RECENT = 2000;
export const SEED_TERMS = new Set([
  ...CONTROL_FOODS,
  ...FALSE_FRIENDS.map((f) => f.term),
  ...Object.values(FAMILIES).flatMap((f) => f.terms),
  ...Object.values(HIDDEN_SOURCES).flat(),
]);

/** Seed vectors from lib/vectors.js, if they were made with this model and dtype. */
async function loadSeedVectors(model, dtype) {
  const { default: pre } = await import('./vectors.js');
  if (pre.model !== model || pre.dtype !== dtype) return new Map();
  const bytes = Uint8Array.from(atob(pre.data), (c) => c.charCodeAt(0));
  const all = new Float32Array(bytes.buffer);
  return new Map(pre.terms.map((t, i) => [t, all.subarray(i * pre.dims, (i + 1) * pre.dims)]));
}

/**
 * Loads the model once and returns a checker. Options: model, device ('cpu', 'wasm',
 * 'webgpu'), dtype, cacheDir, modelPath (a local folder, no network) and onProgress.
 * `precomputed: false` embeds the seed vocabulary live instead of reading lib/vectors.js.
 * `thresholds` overrides some of THRESHOLDS, for tuning. The defaults are the measured ones.
 * Pass `embed(texts)` to bring your own embeddings, as long as they come from the model and
 * dtype the thresholds were measured on.
 */
export async function createChecker(options = {}) {
  const engine = options.embed
    ? { model: options.model || DEFAULT_MODEL, device: 'custom', dtype: options.dtype || 'q8', embed: options.embed }
    : await loadModel(options);
  const known = (options.precomputed ?? !options.embed)
    ? await loadSeedVectors(engine.model, engine.dtype)
    : new Map();
  const recent = new Map();
  const T = Object.freeze({ ...THRESHOLDS, ...options.thresholds });

  async function vectorsFor(texts) {
    const out = new Map();
    const missing = [];
    for (const t of new Set(texts)) {
      const v = known.get(t) || recent.get(t);
      if (v) out.set(t, v);
      else missing.push(t);
    }
    if (missing.length) {
      const vecs = await engine.embed(missing);
      if (recent.size + missing.length > MAX_RECENT) recent.clear();
      missing.forEach((t, i) => {
        out.set(t, vecs[i]);
        (SEED_TERMS.has(t) ? known : recent).set(t, vecs[i]);
      });
    }
    return out;
  }

  /**
   * ingredients: a pasted list (one per line) or an array of lines.
   * allergens: family keys like 'dairy', or any ingredient name, as strings or
   * { allergen, severity }. options.dislikes: names to mention without treating as allergies.
   */
  async function check(ingredients, allergens, { dislikes } = {}) {
    const watch = resolveAllergens(allergens, { dislikes });
    if (!watch.families.length && !watch.custom.length) throw new TypeError('Name at least one allergen.');
    const parsed = parseIngredients(ingredients);
    const vectors = parsed.length
      ? await vectorsFor([...vocabularyFor(watch), ...parsed.map((p) => p.readAs)])
      : new Map();
    const results = parsed.map((p) => ({ ...p, ...scoreIngredient(p.readAs, watch, vectors, T) }));
    return {
      verdict: overallVerdict(results),
      allergens: flaggedAllergens(results),
      ingredients: results,
      model: engine.model,
      disclaimer: DISCLAIMER,
    };
  }

  return { model: engine.model, device: engine.device, dtype: engine.dtype, check };
}

let shared = null;

/** One-call version of createChecker().check(), sharing one loaded model. */
export async function check(ingredients, allergens, options) {
  shared ??= createChecker().catch((err) => {
    shared = null;
    throw err;
  });
  return (await shared).check(ingredients, allergens, options);
}
