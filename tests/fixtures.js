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
