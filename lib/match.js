import { FAMILIES, SEVERITY, FALSE_FRIENDS, HIDDEN_SOURCES, CONTROL_FOODS, ALIASES } from './vocabulary.js';

/**
 * Thresholds, and why they are what they are.
 *
 * The obvious design is "cosine(ingredient, allergen) > X". It does not work. These models
 * place every food close to every other food, so `tomato` scores 0.55 against `pasta` while
 * `burrata` scores 0.43 against `mozzarella`. No value of X separates those.
 *
 * What does work is the MARGIN: how much closer the ingredient sits to the allergen family
 * than to CONTROL_FOODS, a background set of ordinary non-allergenic ingredients. That
 * cancels out the baseline similarity and leaves the signal.
 *
 * Measured on tests/fixtures.js (30 known allergens, 24 known-safe). Run `npm test`.
 */
export const THRESHOLDS = Object.freeze({
  DANGER_SIM: 0.90,     // essentially the same ingredient, e.g. "semolina" vs semolina
  DANGER_MARGIN: 0.02,  // clearly closer to the family than to ordinary food
  DANGER_MIN_SIM: 0.65, // ...and actually similar, not just relatively similar
  CAUTION_MARGIN: -0.05,// resembles the family enough to be worth a label check
  FALSE_FRIEND: 0.86,   // matches a known not-actually-that-allergen term
});
const T = THRESHOLDS;

const NOISE = new Set(['of', 'the', 'a', 'an', 'and', 'or', 'to', 'for', 'with', 'into', 'plus',
  'fresh', 'freshly', 'finely', 'roughly', 'chopped', 'sliced', 'diced', 'minced', 'grated',
  'optional', 'taste', 'needed', 'large', 'small', 'medium', 'ripe', 'warm', 'cold', 'hot']);

const QTY_RE = /^\s*(?:\d+[\d./\s-]*)?\s*(?:(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|g|grams?|kg|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?|pinch(?:es)?|handfuls?|cloves?|slices?|pieces?|cans?|tins?|packets?|bunch(?:es)?|sticks?|sprigs?|dash(?:es)?)(?=\s))?\s*(?:of\s+)?/i;

/** Both vectors are already normalised, so the dot product is the cosine. */
export function cosine(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** "2 tbsp of finely chopped flat-leaf parsley, to taste" -> "flat-leaf parsley" */
export function normalizeIngredient(line) {
  const s = line.toLowerCase().trim()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/,.*$/, ' ')
    .replace(/\b(?:to taste|as needed|optional|or more|if you like|for garnish|for serving)\b/g, ' ')
    .replace(QTY_RE, ' ')
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.split(' ').filter((w) => w && !NOISE.has(w)).join(' ').trim();
}

/** A pasted list (one per line, or separated by semicolons) or an array of lines. */
export function parseIngredients(input) {
  const lines = Array.isArray(input) ? input.map(String) : String(input).split(/\n|;|(?:,(?=\s*\d))/);
  return lines
    .map((l) => l.replace(/^\s*(?:[-*•]+|\d+[.)](?!\d))\s*/, '').trim())
    .filter(Boolean)
    .map((text) => ({ text, readAs: normalizeIngredient(text) }))
    .filter((i) => i.readAs.length > 1);
}

/** Family key for a name like "dairy", "Tree nuts" or "milk", or null if it is not a family. */
export function familyKey(name) {
  const n = String(name).trim().toLowerCase();
  if (FAMILIES[n]) return n;
  if (ALIASES[n]) return ALIASES[n];
  return Object.keys(FAMILIES).find((k) => FAMILIES[k].label.toLowerCase() === n) || null;
}

/**
 * Turns what a caller sends into a watch list. Each item is a family name or any other
 * ingredient name, as a string or as { allergen, severity }. Unknown names are watched as
 * custom terms, so "mango" or "carmine" work without being in the vocabulary.
 */
export function resolveAllergens(allergens, { dislikes = [] } = {}) {
  if (!Array.isArray(allergens)) throw new TypeError('allergens must be an array.');
  const families = new Map();
  const custom = new Map();
  for (const item of allergens) {
    const entry = typeof item === 'string' ? { allergen: item } : item || {};
    const name = String(entry.allergen ?? '').trim().toLowerCase();
    if (!name) continue;
    if (entry.severity !== undefined && !SEVERITY[entry.severity]) {
      throw new TypeError(`Unknown severity "${entry.severity}". Use one of: ${Object.keys(SEVERITY).join(', ')}.`);
    }
    const key = familyKey(name);
    if (key) families.set(key, entry.severity || FAMILIES[key].severityDefault);
    else custom.set(name, entry.severity || 'severe');
  }
  return {
    families: [...families].map(([key, severity]) => ({ key, severity })),
    custom: [...custom].map(([term, severity]) => ({ term, severity })),
    dislikes: [...new Set(dislikes.map((d) => String(d).trim().toLowerCase()).filter(Boolean))],
  };
}

/** Every term a watch list could need to compare against. */
export function vocabularyFor(watch) {
  const terms = new Set(CONTROL_FOODS);
  for (const { key } of watch.families) {
    FAMILIES[key].terms.forEach((t) => terms.add(t));
    (HIDDEN_SOURCES[key] || []).forEach((t) => terms.add(t));
  }
  FALSE_FRIENDS.forEach((f) => terms.add(f.term));
  watch.custom.forEach((c) => terms.add(c.term));
  watch.dislikes.forEach((d) => terms.add(d));
  return [...terms];
}

function levelFor(sim, margin, severityKey) {
  const soft = severityKey === 'mild' || severityKey === 'avoid';
  if (sim >= T.DANGER_SIM) return soft ? 'avoid' : 'danger';
  if (margin >= T.DANGER_MARGIN && sim >= T.DANGER_MIN_SIM) return soft ? 'avoid' : 'danger';
  if (margin >= T.CAUTION_MARGIN) return 'caution';
  return 'clear';
}

function bestMatch(ingVec, terms, vectors) {
  let best = { score: -1, term: null };
  for (const term of terms) {
    const v = vectors.get(term);
    if (!v) continue;
    const s = cosine(ingVec, v);
    if (s > best.score) best = { score: s, term };
  }
  return best;
}

const round = (x) => Math.round(x * 1000) / 1000;

function rank(flag) {
  const base = { danger: 300, caution: 200, avoid: 150, dislike: 50 }[flag.level] || 0;
  return base + (SEVERITY[flag.severity]?.rank || 0);
}

/**
 * Score one normalised ingredient against a watch list. Returns every flag with its reason,
 * because a red badge with no reason is useless to someone cooking.
 */
export function scoreIngredient(readAs, watch, vectors) {
  const ingVec = vectors.get(readAs);
  if (!ingVec) return { flags: [], excused: [] };
  const flags = [];
  const excused = [];
  const sortKey = new Map();

  // The background score. Everything below is measured relative to this.
  const control = bestMatch(ingVec, CONTROL_FOODS, vectors).score;

  // Guard first: an explicit pass beats a confident embedding.
  const passes = new Map();
  for (const ff of FALSE_FRIENDS) {
    const v = vectors.get(ff.term);
    if (v && cosine(ingVec, v) >= T.FALSE_FRIEND) passes.set(ff.notFamily, ff);
  }

  for (const { key, severity } of watch.families) {
    const family = FAMILIES[key];
    const direct = bestMatch(ingVec, family.terms, vectors);
    const hidden = bestMatch(ingVec, HIDDEN_SOURCES[key] || [], vectors);
    const isHidden = hidden.score > direct.score;
    const best = isHidden ? hidden : direct;
    const margin = best.score - control;
    const level = levelFor(best.score, margin, severity);
    if (level === 'clear') continue;

    if (passes.has(key)) {
      const ff = passes.get(key);
      excused.push({ allergen: key, label: family.label, matched: ff.term, reason: ff.reason });
      continue;
    }

    const flag = {
      allergen: key, label: family.label, level, severity,
      reason: isHidden
        ? `Often made with ${best.term}. Check the label.`
        : level === 'caution'
          ? `Closer to ${best.term} than to ordinary ingredients. Worth checking.`
          : `Reads as ${best.term}.`,
      matched: best.term, hidden: isHidden, similarity: round(best.score), margin: round(margin),
    };
    sortKey.set(flag, margin);
    flags.push(flag);
  }

  for (const { term, severity } of watch.custom) {
    const v = vectors.get(term);
    if (!v) continue;
    const score = cosine(ingVec, v);
    const level = levelFor(score, score - control, severity);
    if (level === 'clear') continue;
    const flag = {
      allergen: term, label: term, level, severity, custom: true,
      reason: level === 'caution' ? `Close to "${term}".` : `Matches "${term}".`,
      matched: term, hidden: false, similarity: round(score), margin: round(score - control),
    };
    sortKey.set(flag, score - control);
    flags.push(flag);
  }

  for (const term of watch.dislikes) {
    const v = vectors.get(term);
    const score = v ? cosine(ingVec, v) : -1;
    if (score < T.DANGER_SIM) continue;
    const flag = {
      allergen: term, label: `Dislikes ${term}`, level: 'dislike', severity: 'mild',
      reason: 'Not dangerous. Just hated.',
      matched: term, hidden: false, similarity: round(score), margin: 0,
    };
    sortKey.set(flag, 0);
    flags.push(flag);
  }

  flags.sort((a, b) => rank(b) - rank(a) || sortKey.get(b) - sortKey.get(a));
  return { flags, excused };
}

export function overallVerdict(ingredients) {
  let worst = 'safe';
  for (const ing of ingredients) {
    for (const f of ing.flags) {
      if (f.level === 'danger') return 'unsafe';
      if (f.level === 'caution') worst = 'check';
      if ((f.level === 'avoid' || f.level === 'dislike') && worst === 'safe') worst = 'avoid';
    }
  }
  return worst;
}
