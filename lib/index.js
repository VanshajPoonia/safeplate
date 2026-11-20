import { FAMILIES, SEVERITY, FALSE_FRIENDS, HIDDEN_SOURCES, CONTROL_FOODS } from './vocabulary.js';
import { parseIngredients, resolveAllergens, vocabularyFor, scoreIngredient, overallVerdict } from './match.js';
import { loadModel, DEFAULT_MODEL } from './model.js';

export { FAMILIES, SEVERITY, FALSE_FRIENDS, HIDDEN_SOURCES, CONTROL_FOODS } from './vocabulary.js';
export { THRESHOLDS, normalizeIngredient, parseIngredients, resolveAllergens, familyKey } from './match.js';
export { DEFAULT_MODEL } from './model.js';

/** The allergen families a caller can ask for, by key. */
export const ALLERGENS = Object.entries(FAMILIES).map(([key, f]) => ({
  key, label: f.label, severityDefault: f.severityDefault,
}));

// Seed terms live for the life of a checker. Ingredient vectors are dropped in bulk past this.
const MAX_RECENT = 2000;
const FIXED = new Set([
  ...CONTROL_FOODS,
  ...FALSE_FRIENDS.map((f) => f.term),
  ...Object.values(FAMILIES).flatMap((f) => f.terms),
  ...Object.values(HIDDEN_SOURCES).flat(),
]);

/**
 * Loads the model once and returns a checker. Options: model, device ('auto', 'cpu',
 * 'wasm', 'webgpu'), dtype, cacheDir, onProgress. Pass `embed(texts)` to bring your own
 * embeddings, as long as they come from the same model the thresholds were measured on.
 */
export async function createChecker(options = {}) {
  const engine = options.embed
    ? { model: options.model || DEFAULT_MODEL, device: 'custom', dtype: 'custom', embed: options.embed }
    : await loadModel(options);
  const known = new Map();
  const recent = new Map();

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
        (FIXED.has(t) ? known : recent).set(t, vecs[i]);
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
    const results = parsed.map((p) => ({ ...p, ...scoreIngredient(p.readAs, watch, vectors) }));
    const flagged = new Set();
    results.forEach((r) => r.flags.forEach((f) => f.level !== 'dislike' && flagged.add(f.allergen)));
    return {
      verdict: overallVerdict(results),
      allergens: [...flagged],
      ingredients: results,
      model: engine.model,
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
