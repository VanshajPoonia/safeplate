import { parseIngredientList, scanList } from './scan.js';

/**
 * Score every recipe in the bank against the profile, then build a week that is
 * safe first and varied second. A meal plan that is safe and boring gets ignored,
 * and an ignored plan is not safer than no plan.
 */
export async function scoreBank(recipes, profile, onProgress) {
  const scored = [];
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const parsed = parseIngredientList(recipe.ingredients.join('\n'));
    const { results, verdict } = await scanList(parsed, profile);
    const problems = results.filter((r) => r.hits.some((h) => h.verdict !== 'excused'));
    scored.push({
      recipe,
      verdict,
      problems,
      // Swaps are usually possible when only one or two lines are at fault.
      fixable: verdict !== 'safe' && problems.length <= 2,
    });
    onProgress?.(i + 1, recipes.length);
  }
  return scored;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function buildWeek(scored, { maxMinutes = 999, allowCheck = false } = {}) {
  const pool = scored
    .filter((s) => s.verdict === 'safe' || (allowCheck && s.verdict === 'check'))
    .filter((s) => s.recipe.minutes <= maxMinutes);

  if (!pool.length) return { days: [], pool: 0 };

  // Greedy pick that penalises repeating a cuisine, so the week does not become
  // seven variations of the same dinner.
  const usedCuisine = new Map();
  const chosen = [];
  const remaining = [...pool];

  for (let d = 0; d < 7 && remaining.length; d++) {
    remaining.sort((a, b) => {
      const pa = (usedCuisine.get(a.recipe.cuisine) || 0) * 10 + (a.verdict === 'safe' ? 0 : 3);
      const pb = (usedCuisine.get(b.recipe.cuisine) || 0) * 10 + (b.verdict === 'safe' ? 0 : 3);
      return (pa - pb) || (a.recipe.minutes - b.recipe.minutes) * 0.01 - Math.random() * 0.5;
    });
    const pick = remaining.shift();
    usedCuisine.set(pick.recipe.cuisine, (usedCuisine.get(pick.recipe.cuisine) || 0) + 1);
    chosen.push({ day: DAYS[d], ...pick });
  }
  return { days: chosen, pool: pool.length };
}

const AISLES = [
  { name: 'Produce', match: /\b(onion|garlic|ginger|tomato|carrot|celery|courgette|pepper|spinach|kale|rocket|cucumber|lemon|lime|avocado|potato|cauliflower|aubergine|mushroom|broccoli|mangetout|parsley|coriander|basil|mint|thyme|rosemary|spring onion|sprouts|chilli)\b/i },
  { name: 'Protein', match: /\b(chicken|lamb|beef|pork|salmon|prawn|fish|tofu|egg|mince)\b/i },
  { name: 'Dairy & chilled', match: /\b(milk|cream|butter|cheese|yogurt|halloumi|mozzarella|parmesan|ghee|paneer)\b/i },
  { name: 'Dry & grains', match: /\b(rice|noodle|pasta|linguine|soba|quinoa|lentil|dal|flour|tortilla|bread|flatbread|couscous)\b/i },
  { name: 'Tins & jars', match: /\b(tinned|can|canned|chickpea|bean|passata|coconut milk|stock|paste|sauce|miso|tahini|peanut butter|olive)\b/i },
  { name: 'Spices & oils', match: /\b(oil|cumin|turmeric|paprika|masala|cinnamon|anise|oregano|vinegar|seed|salt|pepper|sugar|mirin|soy|tamari)\b/i },
];

export function shoppingList(days) {
  const byAisle = new Map(AISLES.map((a) => [a.name, new Map()]));
  byAisle.set('Other', new Map());

  for (const d of days) {
    for (const line of d.recipe.ingredients) {
      const aisle = AISLES.find((a) => a.match.test(line))?.name || 'Other';
      const bucket = byAisle.get(aisle);
      const key = line.toLowerCase();
      bucket.set(key, { line, count: (bucket.get(key)?.count || 0) + 1 });
    }
  }

  return [...byAisle.entries()]
    .map(([aisle, items]) => ({ aisle, items: [...items.values()] }))
    .filter((g) => g.items.length);
}

export function planToMarkdown(days, profileName) {
  const out = [`# Week of dinners${profileName ? ` for ${profileName}` : ''}`, ''];
  days.forEach((d) => {
    out.push(`## ${d.day} — ${d.recipe.name}`);
    out.push(`*${d.recipe.cuisine} · ${d.recipe.minutes} min · serves ${d.recipe.serves}*`, '');
    d.recipe.ingredients.forEach((i) => out.push(`- ${i}`));
    out.push('', d.recipe.method, '');
    if (d.problems.length) {
      out.push('> Check before cooking:');
      d.problems.forEach((p) => {
        p.hits.filter((h) => h.verdict !== 'excused').forEach((h) => {
          out.push(`> - ${p.raw} — ${h.label}: ${h.reason}`);
        });
      });
      out.push('');
    }
  });
  out.push('## Shopping list', '');
  shoppingList(days).forEach((g) => {
    out.push(`### ${g.aisle}`, '');
    g.items.forEach((i) => out.push(`- ${i.line}${i.count > 1 ? ` (×${i.count})` : ''}`));
    out.push('');
  });
  return out.join('\n');
}
