// Seed vocabulary. This is deliberately NOT an exhaustive list, because an exhaustive
// list is impossible to maintain and is exactly the failure mode this app exists to fix.
// These terms are anchors: the embedding model generalises from them to the thousands of
// names nobody thought to write down (burrata, labneh, surimi, seitan, kataifi, bonito).

export const FAMILIES = {
  dairy: {
    label: 'Dairy',
    icon: '🥛',
    severityDefault: 'severe',
    terms: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'ghee', 'casein', 'whey', 'lactose',
      'paneer', 'curd', 'custard', 'condensed milk', 'milk powder', 'buttermilk', 'mozzarella',
      'parmesan', 'ricotta', 'mascarpone', 'creme fraiche', 'khoya', 'malai'],
  },
  gluten: {
    label: 'Gluten / wheat',
    icon: '🌾',
    severityDefault: 'severe',
    terms: ['wheat', 'flour', 'maida', 'atta', 'semolina', 'suji', 'rava', 'barley', 'rye', 'malt',
      'couscous', 'seitan', 'bread', 'breadcrumbs', 'pasta', 'noodles', 'bulgur', 'farro', 'spelt',
      'durum', 'soy sauce', 'puff pastry', 'cracker', 'biscuit', 'roux'],
  },
  peanut: {
    label: 'Peanut',
    icon: '🥜',
    severityDefault: 'anaphylactic',
    terms: ['peanut', 'peanut butter', 'groundnut', 'arachis oil', 'satay sauce', 'monkey nut'],
  },
  treenut: {
    label: 'Tree nuts',
    icon: '🌰',
    severityDefault: 'anaphylactic',
    terms: ['almond', 'cashew', 'walnut', 'pistachio', 'pecan', 'hazelnut', 'macadamia', 'brazil nut',
      'pine nut', 'praline', 'marzipan', 'nougat', 'nut butter', 'badam', 'kaju', 'frangipane'],
  },
  sesame: {
    label: 'Sesame',
    icon: '🫓',
    severityDefault: 'anaphylactic',
    terms: ['sesame', 'sesame oil', 'sesame seed', 'til', 'tahini', 'hummus', 'halva', 'benne',
      'gomashio', 'za\'atar', 'baba ganoush'],
  },
  egg: {
    label: 'Egg',
    icon: '🥚',
    severityDefault: 'severe',
    terms: ['egg', 'egg white', 'egg yolk', 'albumen', 'mayonnaise', 'meringue', 'aioli',
      'hollandaise', 'egg wash', 'frittata', 'omelette'],
  },
  soy: {
    label: 'Soy',
    icon: '🫘',
    severityDefault: 'moderate',
    terms: ['soy', 'soya', 'tofu', 'edamame', 'tempeh', 'miso', 'tamari', 'soy lecithin',
      'textured vegetable protein', 'soybean oil'],
  },
  shellfish: {
    label: 'Shellfish',
    icon: '🦐',
    severityDefault: 'anaphylactic',
    terms: ['shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'scallop', 'clam', 'mussel', 'oyster',
      'squid', 'calamari', 'surimi', 'krill', 'langoustine'],
  },
  fish: {
    label: 'Fish',
    icon: '🐟',
    severityDefault: 'severe',
    terms: ['fish', 'anchovy', 'salmon', 'tuna', 'cod', 'sardine', 'mackerel', 'haddock',
      'fish sauce', 'worcestershire sauce', 'bonito', 'dashi', 'caviar', 'roe'],
  },
  mustard: {
    label: 'Mustard',
    icon: '🟡',
    severityDefault: 'moderate',
    terms: ['mustard', 'dijon', 'wholegrain mustard', 'mustard seed', 'sarson', 'rai', 'mustard oil'],
  },
  sulphites: {
    label: 'Sulphites',
    icon: '🍷',
    severityDefault: 'moderate',
    terms: ['sulphite', 'sulfite', 'wine', 'dried apricot', 'balsamic vinegar', 'pickled',
      'preserved', 'grape juice concentrate'],
  },
  allium: {
    label: 'Onion & garlic',
    icon: '🧅',
    severityDefault: 'moderate',
    terms: ['onion', 'garlic', 'shallot', 'leek', 'chive', 'spring onion', 'scallion',
      'garlic powder', 'onion powder', 'asafoetida'],
  },
  nightshade: {
    label: 'Nightshades',
    icon: '🍅',
    severityDefault: 'mild',
    terms: ['tomato', 'potato', 'aubergine', 'eggplant', 'bell pepper', 'capsicum', 'chilli',
      'paprika', 'cayenne', 'goji berry'],
  },
  pork: {
    label: 'Pork',
    icon: '🐖',
    severityDefault: 'avoid',
    terms: ['pork', 'bacon', 'ham', 'lard', 'gelatin', 'prosciutto', 'chorizo', 'pancetta',
      'pepperoni', 'salami'],
  },
  beef: {
    label: 'Beef',
    icon: '🐄',
    severityDefault: 'avoid',
    terms: ['beef', 'steak', 'veal', 'beef stock', 'beef tallow', 'brisket', 'mince'],
  },
  alcohol: {
    label: 'Alcohol',
    icon: '🍸',
    severityDefault: 'avoid',
    terms: ['wine', 'beer', 'rum', 'brandy', 'vodka', 'sherry', 'mirin', 'vanilla extract',
      'cooking wine', 'liqueur'],
  },
};

// Ordinary foods that are none of the above. Every ingredient is scored against these too,
// and only the MARGIN counts. Without this, the model rates any two foods ~0.7 similar and
// no absolute threshold separates "is dairy" from "is food". Measured, not guessed: see README.
export const CONTROL_FOODS = [
  'carrot', 'spinach', 'tomato', 'potato', 'apple', 'banana', 'rice', 'quinoa', 'olive oil',
  'chicken', 'beef', 'black pepper', 'cumin', 'basil', 'water', 'sugar', 'salt', 'lentil',
  'sweetcorn', 'cucumber', 'onion', 'garlic', 'mushroom', 'pumpkin', 'avocado', 'chickpea',
  'coconut', 'lemon', 'vinegar', 'honey',
];

export const SEVERITY = {
  anaphylactic: { label: 'Anaphylactic', rank: 4, note: 'Trace amounts matter. Shared pans matter.' },
  severe: { label: 'Severe', rank: 3, note: 'Makes them properly ill.' },
  moderate: { label: 'Moderate', rank: 2, note: 'Uncomfortable but not dangerous.' },
  mild: { label: 'Mild', rank: 1, note: 'Prefers to avoid.' },
  avoid: { label: 'Avoids', rank: 1, note: 'Dietary or religious choice.' },
};

// Things that read like an allergen to a language model but are not one.
// "Coconut milk" is not dairy. "Nutmeg" is not a nut. The embedding will happily
// disagree, so these get an explicit pass with a reason the user can see.
export const FALSE_FRIENDS = [
  { term: 'coconut milk', notFamily: 'dairy', reason: 'Coconut milk contains no dairy.' },
  { term: 'coconut cream', notFamily: 'dairy', reason: 'Coconut cream contains no dairy.' },
  { term: 'almond milk', notFamily: 'dairy', reason: 'A nut milk, not dairy (still flags tree nuts).' },
  { term: 'oat milk', notFamily: 'dairy', reason: 'Not dairy (may still flag gluten).' },
  { term: 'soy milk', notFamily: 'dairy', reason: 'Not dairy (still flags soy).' },
  { term: 'cocoa butter', notFamily: 'dairy', reason: 'A plant fat, not butter.' },
  { term: 'shea butter', notFamily: 'dairy', reason: 'A plant fat, not butter.' },
  { term: 'peanut butter', notFamily: 'dairy', reason: 'Not butter (still flags peanut).' },
  { term: 'nutmeg', notFamily: 'treenut', reason: 'A seed spice, not a tree nut.' },
  { term: 'water chestnut', notFamily: 'treenut', reason: 'An aquatic vegetable, not a nut.' },
  { term: 'buckwheat', notFamily: 'gluten', reason: 'A seed, unrelated to wheat. Naturally gluten free.' },
  { term: 'rice flour', notFamily: 'gluten', reason: 'Rice is gluten free.' },
  { term: 'chickpea flour', notFamily: 'gluten', reason: 'Besan is gluten free.' },
  { term: 'almond flour', notFamily: 'gluten', reason: 'Gluten free (still flags tree nuts).' },
  { term: 'corn flour', notFamily: 'gluten', reason: 'Corn is gluten free.' },
  { term: 'eggplant', notFamily: 'egg', reason: 'A vegetable. The name is a lie.' },
  { term: 'aubergine', notFamily: 'egg', reason: 'A vegetable, no egg involved.' },
  { term: 'cream of tartar', notFamily: 'dairy', reason: 'An acid salt, not cream.' },
  { term: 'nutritional yeast', notFamily: 'dairy', reason: 'Tastes cheesy, contains no dairy.' },
  { term: 'butternut squash', notFamily: 'treenut', reason: 'A squash. Neither butter nor nut.' },
  { term: 'pineapple', notFamily: 'treenut', reason: 'Not a pine nut.' },
];

// Terms the model should know are suspicious even when the user has not named them,
// because they hide the allergen behind a process word.
export const HIDDEN_SOURCES = {
  gluten: ['soy sauce', 'stock cube', 'asafoetida', 'malt vinegar', 'oats', 'beer'],
  dairy: ['naan', 'pesto', 'caesar dressing', 'milk chocolate', 'brioche'],
  fish: ['worcestershire sauce', 'caesar dressing', 'oyster sauce', 'kimchi'],
  egg: ['fresh pasta', 'brioche', 'tartare sauce', 'some noodles'],
  sesame: ['burger bun', 'falafel', 'dukkah', 'some crackers'],
  peanut: ['satay', 'some curry pastes', 'some chilli oils'],
};

export function allFamilyKeys() {
  return Object.keys(FAMILIES);
}
