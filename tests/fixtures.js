// The fixture set the thresholds in src/scan.js were measured against.
// HIT  = a real allergen the app must flag (danger or caution).
// PASS = a safe ingredient the app must not flag, except where the
//        false-friend guard in src/allergens.js is expected to excuse it.
export const FIXTURES = [
  // --- must be flagged ---
  ['burrata', 'dairy', 'HIT'],
  ['labneh', 'dairy', 'HIT'],
  ['halloumi', 'dairy', 'HIT'],
  ['quark', 'dairy', 'HIT'],
  ['kefir', 'dairy', 'HIT'],
  ['clotted cream', 'dairy', 'HIT'],
  ['mascarpone', 'dairy', 'HIT'],
  ['creme fraiche', 'dairy', 'HIT'],
  ['kataifi pastry', 'gluten', 'HIT'],
  ['semolina', 'gluten', 'HIT'],
  ['orzo', 'gluten', 'HIT'],
  ['panko', 'gluten', 'HIT'],
  ['freekeh', 'gluten', 'HIT'],
  ['udon', 'gluten', 'HIT'],
  ['farro', 'gluten', 'HIT'],
  ['bulgur', 'gluten', 'HIT'],
  ['surimi', 'shellfish', 'HIT'],
  ['langostino', 'shellfish', 'HIT'],
  ['scampi', 'shellfish', 'HIT'],
  ['crawfish', 'shellfish', 'HIT'],
  ['gomasio', 'sesame', 'HIT'],
  ['benne seed', 'sesame', 'HIT'],
  ['simit bread', 'sesame', 'HIT'],
  ["za'atar", 'sesame', 'HIT'],
  ['tahina', 'sesame', 'HIT'],
  ['pralines', 'treenut', 'HIT'],
  ['gianduja', 'treenut', 'HIT'],
  ['pignoli', 'treenut', 'HIT'],
  ['marcona almonds', 'treenut', 'HIT'],
  ['filberts', 'treenut', 'HIT'],

  // --- must not be flagged ---
  ['rice flour', 'gluten', 'PASS'],
  ['coconut milk', 'dairy', 'PASS'],
  ['chickpea flour', 'gluten', 'PASS'],
  ['buckwheat flour', 'gluten', 'PASS'],
  ['nutmeg', 'treenut', 'PASS'],
  ['cocoa butter', 'dairy', 'PASS'],
  ['butternut squash', 'treenut', 'PASS'],
  ['pineapple', 'treenut', 'PASS'],
  ['tomato', 'gluten', 'PASS'],
  ['olive oil', 'dairy', 'PASS'],
  ['corn tortilla', 'gluten', 'PASS'],
  ['water chestnut', 'treenut', 'PASS'],
  ['spinach', 'shellfish', 'PASS'],
  ['aubergine', 'dairy', 'PASS'],
  ['nutritional yeast', 'dairy', 'PASS'],
  ['cucumber', 'sesame', 'PASS'],
  ['chicken breast', 'dairy', 'PASS'],
  ['basmati rice', 'gluten', 'PASS'],
  ['olive', 'treenut', 'PASS'],
  ['fresh parsley', 'gluten', 'PASS'],
  ['smoked paprika', 'shellfish', 'PASS'],
  ['red lentils', 'treenut', 'PASS'],
  ['sweet potato', 'dairy', 'PASS'],
  ['green beans', 'shellfish', 'PASS'],
];

// Known misses, kept here deliberately rather than quietly added to the vocabulary.
// A seed list that absorbs every failure stops being a test of generalisation.
export const KNOWN_MISSES = ['gianduja'];

// Everyday ingredients that contain none of the nine major allergens below. tests/noise.mjs
// checks each one against all nine at once, the way a menu tool would, and counts flags.
// Picked by hand before measuring, and kept out of CONTROL_FOODS on purpose.
export const EVERYDAY = [
  'courgette', 'broccoli', 'cauliflower', 'green peas', 'lettuce', 'kale', 'pear', 'mango',
  'strawberries', 'blueberries', 'chicken breast', 'lamb shoulder', 'turkey mince', 'brown rice',
  'millet', 'polenta', 'corn tortilla', 'red lentils', 'black beans', 'kidney beans',
  'sweet potato', 'butternut squash', 'red onion', 'ginger', 'turmeric', 'coriander', 'mint',
  'thyme', 'rosemary', 'oregano', 'maple syrup', 'brown sugar', 'apple cider vinegar',
  'sunflower oil', 'rapeseed oil', 'coconut oil', 'vegetable stock', 'tomato passata',
  'garam masala', 'smoked paprika',
];
export const MAJOR_NINE = ['dairy', 'gluten', 'peanut', 'treenut', 'sesame', 'egg', 'soy', 'shellfish', 'fish'];

// The 22-recipe bank labelled for the demo profile in the README: dairy, gluten, sesame,
// shellfish and tree nuts. CONTAINS lists the recipes with at least one of the five.
// r14 (vegetable stock) and r22 (tamari) may contain gluten, so they count either way.
export const DEMO_PROFILE = ['dairy', 'gluten', 'sesame', 'shellfish', 'treenut'];
export const RECIPE_TRUTH = {
  contains: ['r04', 'r05', 'r06', 'r07', 'r09', 'r10', 'r11', 'r13', 'r15', 'r16', 'r18', 'r20', 'r21'],
  free: ['r01', 'r02', 'r03', 'r08', 'r12', 'r17', 'r19'],
  maybe: ['r14', 'r22'],
};
