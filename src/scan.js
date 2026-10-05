import { FAMILIES, SEVERITY, FALSE_FRIENDS, HIDDEN_SOURCES, CONTROL_FOODS } from './allergens.js';
import { embed, cosine } from './embed.js';

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
 * Measured on tests/fixtures.js (30 known allergens, 24 known-safe): 28 of 30 flagged,
 * 1 genuine false alarm. Run `npm test` to reproduce.
 */
const T = {
  DANGER_SIM: 0.90,     // essentially the same ingredient, e.g. "semolina" vs semolina
  DANGER_MARGIN: 0.02,  // clearly closer to the family than to ordinary food
  DANGER_MIN_SIM: 0.65, // ...and actually similar, not just relatively similar
  CAUTION_MARGIN: -0.05,// resembles the family enough to be worth a label check
  FALSE_FRIEND: 0.86,   // matches a known not-actually-that-allergen term
};

const NOISE = new Set(['of', 'the', 'a', 'an', 'and', 'or', 'to', 'for', 'with', 'into', 'plus',
  'fresh', 'freshly', 'finely', 'roughly', 'chopped', 'sliced', 'diced', 'minced', 'grated',
  'optional', 'taste', 'needed', 'large', 'small', 'medium', 'ripe', 'warm', 'cold', 'hot']);

const QTY_RE = /^\s*(?:\d+[\d./\s-]*)?\s*(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|g|grams?|kg|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?|pinch(?:es)?|handfuls?|cloves?|slices?|pieces?|cans?|tins?|packets?|bunch(?:es)?|sticks?|sprigs?|dash(?:es)?)?\s*(?:of\s+)?/i;

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

export function parseIngredientList(text) {
  return text
    .split(/\n|;|(?:,(?=\s*\d))/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .map((raw) => ({ raw, norm: normalizeIngredient(raw) }))
    .filter((i) => i.norm.length > 1);
}

/** Every term the active profile could need to compare against. */
export function vocabularyFor(profile) {
  const terms = new Set(CONTROL_FOODS);
  for (const key of profile.families) {
    FAMILIES[key]?.terms.forEach((t) => terms.add(t));
    (HIDDEN_SOURCES[key] || []).forEach((t) => terms.add(t));
  }
  FALSE_FRIENDS.forEach((f) => terms.add(f.term));
  (profile.custom || []).forEach((c) => terms.add(c.term));
  (profile.dislikes || []).forEach((d) => terms.add(d));
  return [...terms];
}

export async function warmProfile(profile) {
  const terms = vocabularyFor(profile);
  await embed(terms);
  return terms.length;
}

function verdictFor(sim, margin, severityKey) {
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

/**
 * Score one normalised ingredient against the profile. Returns every hit, because
 * "why" is the whole product: a red badge with no reason is useless to someone cooking.
 */
export function scanIngredient(norm, profile, vectors) {
  const ingVec = vectors.get(norm);
  if (!ingVec) return [];
  const hits = [];

  // The background score. Everything below is measured relative to this.
  const control = bestMatch(ingVec, CONTROL_FOODS, vectors).score;

  // Guard first: an explicit pass beats a confident embedding.
  const excused = new Map();
  for (const ff of FALSE_FRIENDS) {
    const v = vectors.get(ff.term);
    if (v && cosine(ingVec, v) >= T.FALSE_FRIEND) excused.set(ff.notFamily, ff);
  }

  for (const key of profile.families) {
    const family = FAMILIES[key];
    if (!family) continue;
    const severityKey = profile.severity?.[key] || family.severityDefault;

    const direct = bestMatch(ingVec, family.terms, vectors);
    const hidden = bestMatch(ingVec, HIDDEN_SOURCES[key] || [], vectors);
    const isHidden = hidden.score > direct.score;
    const best = isHidden ? hidden : direct;
    const margin = best.score - control;
    const verdict = verdictFor(best.score, margin, severityKey);
    if (verdict === 'clear') continue;

    if (excused.has(key)) {
      const ff = excused.get(key);
      hits.push({ family: key, label: family.label, icon: family.icon, verdict: 'excused',
        matched: ff.term, score: best.score, margin, severity: severityKey, reason: ff.reason });
      continue;
    }

    hits.push({
      family: key, label: family.label, icon: family.icon, verdict,
      matched: best.term, score: best.score, margin, severity: severityKey, hidden: isHidden,
      reason: isHidden
        ? `Often made with ${best.term}. Check the label.`
        : verdict === 'danger' || verdict === 'avoid'
          ? `Reads as ${best.term}.`
          : `Closer to ${best.term} than to ordinary ingredients. Worth checking.`,
    });
  }

  for (const custom of profile.custom || []) {
    const v = vectors.get(custom.term);
    if (!v) continue;
    const score = cosine(ingVec, v);
    const verdict = verdictFor(score, score - control, custom.severity || 'severe');
    if (verdict === 'clear') continue;
    hits.push({ family: `custom:${custom.term}`, label: custom.term, icon: '⚠️', verdict,
      matched: custom.term, score, margin: score - control, severity: custom.severity || 'severe',
      reason: verdict === 'caution' ? `Close to "${custom.term}".` : `Matches "${custom.term}".` });
  }

  for (const dislike of profile.dislikes || []) {
    const v = vectors.get(dislike);
    if (v && cosine(ingVec, v) >= T.DANGER_SIM) {
      hits.push({ family: `dislike:${dislike}`, label: `Dislikes ${dislike}`, icon: '😖',
        verdict: 'dislike', matched: dislike, score: cosine(ingVec, v), margin: 0, severity: 'mild',
        reason: 'Not dangerous. Just hated.' });
    }
  }

  hits.sort((a, b) => rank(b) - rank(a) || b.margin - a.margin);
  return hits;
}

function rank(hit) {
  const base = { danger: 300, caution: 200, avoid: 150, dislike: 50, excused: 10 }[hit.verdict] || 0;
  return base + (SEVERITY[hit.severity]?.rank || 0);
}

/** Scan a whole ingredient list. One embedding pass, then pure arithmetic. */
export async function scanList(ingredients, profile) {
  const norms = [...new Set(ingredients.map((i) => i.norm))];
  const all = [...new Set([...norms, ...vocabularyFor(profile)])];
  const vecs = await embed(all);
  const vectors = new Map(all.map((t, i) => [t, vecs[i]]));

  const results = ingredients.map((ing) => ({ ...ing, hits: scanIngredient(ing.norm, profile, vectors) }));
  return { results, verdict: overallVerdict(results) };
}

export function overallVerdict(results) {
  let worst = 'safe';
  for (const r of results) {
    for (const h of r.hits) {
      if (h.verdict === 'danger') return 'unsafe';
      if (h.verdict === 'caution' && worst !== 'unsafe') worst = 'check';
      if ((h.verdict === 'avoid' || h.verdict === 'dislike') && worst === 'safe') worst = 'avoid';
    }
  }
  return worst;
}

export { T as THRESHOLDS };
