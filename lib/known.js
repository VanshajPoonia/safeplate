// Common ingredients with a known allergen status, checked before the embedding.
// Built from general food knowledge and public allergen guidance (FDA major allergens, EU
// Annex II, FARE-style hidden-source lists), not from the test sets.
//
// Each row: names ; contains ; may ; note
//   contains  families a usual recipe or product has. These flag at danger level.
//   may       families some recipes or brands have. These flag as worth checking.
//   any other family is known to be absent, so the embedding's guess is overruled.
// When in doubt a family goes in `may`, never in the absent group.

const ROWS = `
# Dairy
milk|whole milk|skimmed milk|skim milk|semi-skimmed milk|cow's milk|goat's milk ; dairy ;
cream|double cream|single cream|whipping cream|heavy cream|light cream ; dairy ;
sour cream|soured cream ; dairy ;
creme fraiche ; dairy ;
clotted cream ; dairy ;
butter|salted butter|unsalted butter ; dairy ;
ghee ; dairy ;
yogurt|yoghurt|greek yogurt|natural yogurt|plain yogurt|curd|dahi ; dairy ;
buttermilk ; dairy ;
kefir ; dairy ;
cheese ; dairy ;
cheddar|cheddar cheese ; dairy ;
parmesan|parmigiano reggiano|parmesan cheese ; dairy ;
pecorino|pecorino romano ; dairy ;
grana padano ; dairy ;
mozzarella|buffalo mozzarella ; dairy ;
burrata ; dairy ;
feta|feta cheese ; dairy ;
halloumi ; dairy ;
ricotta ; dairy ;
mascarpone ; dairy ;
paneer ; dairy ;
cream cheese ; dairy ;
cottage cheese ; dairy ;
goat cheese|goat's cheese|chevre ; dairy ;
brie ; dairy ;
camembert ; dairy ;
gouda ; dairy ;
gruyere ; dairy ;
emmental ; dairy ;
manchego ; dairy ;
blue cheese|stilton|gorgonzola|roquefort ; dairy ;
labneh ; dairy ;
quark ; dairy ;
skyr ; dairy ;
condensed milk|sweetened condensed milk ; dairy ;
evaporated milk ; dairy ;
milk powder|powdered milk ; dairy ;
whey|whey protein ; dairy ;
casein ; dairy ;
khoya|khoa ; dairy ;
malai ; dairy ;
ice cream ; dairy ; egg treenut peanut ;
custard ; dairy ; egg ;
custard powder ; ; dairy ;
milk chocolate ; dairy ; soy treenut peanut ;
white chocolate ; dairy ; soy ;
dark chocolate ; ; dairy soy ;

# Plant milks and fats
coconut milk ; ; treenut sulphites ; Coconut is not dairy. Some allergy groups still list it with tree nuts.
coconut cream ; ; treenut sulphites ;
coconut oil ; ; treenut ;
coconut|desiccated coconut|shredded coconut ; ; treenut sulphites ;
almond milk ; treenut ; soy ;
oat milk ; ; gluten ;
soy milk|soya milk ; soy ;
rice milk ; ; gluten ;
olive oil|extra virgin olive oil ; ;
sunflower oil ; ;
rapeseed oil|canola oil ; ;
vegetable oil ; ; soy peanut ;
sesame oil|toasted sesame oil ; sesame ;
peanut oil|groundnut oil ; peanut ;
lard ; pork ;
beef dripping|beef tallow ; beef ;
suet|shredded suet ; beef ; gluten ; Packet suet is usually coated in wheat flour.

# Eggs
egg|eggs|egg white|egg yolk|whole egg|free-range eggs|soft-boiled eggs|hard-boiled eggs|quail eggs ; egg ;
mayonnaise|mayo ; egg ; mustard sulphites soy allium ;
aioli ; egg allium ; mustard ;
meringue ; egg ;
hollandaise|hollandaise sauce ; egg dairy ; sulphites ;

# Grains, flours and starches
rice|white rice|basmati rice|jasmine rice|arborio rice|brown rice|wild rice|long grain rice|sushi rice|cooked rice|cooked cold rice|rice grains ; ;
quinoa ; ;
millet ; ;
sorghum ; ;
teff ; ;
amaranth ; ;
buckwheat|buckwheat groats|buckwheat flour ; ; gluten ; Buckwheat is a seed, not wheat. Flour blends sometimes add wheat.
oats|rolled oats|porridge oats|oatmeal ; ; gluten ; Oats are often grown and milled next to wheat.
polenta|cornmeal ; ;
cornflour|cornstarch|corn starch ; ;
masa harina ; ;
rice flour ; ;
chickpea flour|gram flour|besan ; ;
almond flour|ground almonds|almond meal ; treenut ;
coconut flour ; ; treenut ;
tapioca|tapioca flour|tapioca starch ; ;
arrowroot ; ;
potato starch ; nightshade ;
flour|plain flour|all-purpose flour|self-raising flour|bread flour|wheat flour|whole wheat flour|wholemeal flour|strong flour ; gluten ;
atta|maida ; gluten ;
semolina|suji|rava|sooji ; gluten ;
couscous ; gluten ;
bulgur|bulgur wheat ; gluten ;
farro ; gluten ;
spelt|spelt flour ; gluten ;
barley|pearl barley ; gluten ;
rye|rye flour ; gluten ;
freekeh ; gluten ;
wheat germ ; gluten ;
seitan ; gluten ;
poha|flattened rice ; ;

# Pasta, noodles and bread
pasta|spaghetti|linguine|penne|fusilli|rigatoni|farfalle|macaroni|small pasta|dried pasta|lasagne sheets|lasagna sheets|orzo ; gluten ; egg ;
fresh pasta|tagliatelle|fettuccine|pappardelle ; gluten egg ;
egg noodles ; gluten egg ;
udon|udon noodles ; gluten ;
ramen|ramen noodles ; gluten ; egg ;
soba|soba noodles ; gluten ; ; Most soba is part wheat.
rice noodles|rice vermicelli|vermicelli rice noodles|flat rice noodles ; ; gluten ;
glass noodles|mung bean noodles|cellophane noodles ; ;
bread|white bread|brown bread|wholemeal bread|crusty bread|sliced bread ; gluten ; dairy egg sesame soy ;
sourdough|sourdough bread ; gluten ;
baguette ; gluten ;
ciabatta ; gluten ;
focaccia ; gluten ;
naan|naan bread ; gluten ; dairy egg ;
pita|pitta|pita bread|pitta bread ; gluten ; sesame ;
flatbread|flatbreads ; gluten ; dairy sesame ;
roti|chapati|phulka ; gluten ;
paratha ; gluten ; dairy ;
tortilla|tortillas|flour tortilla|flour tortillas|wheat tortilla|wraps ; gluten ;
corn tortilla|corn tortillas ; ; gluten ; Some corn tortillas mix in wheat flour.
brioche ; gluten egg dairy ;
croissant ; gluten dairy ; egg ;
burger bun|burger buns|bun|buns ; gluten ; sesame dairy egg soy ;
bagel ; gluten ; sesame egg ;
breadcrumbs|panko|panko breadcrumbs ; gluten ; dairy soy ;
croutons ; gluten ; dairy allium ;
crackers|cracker ; gluten ; dairy sesame ;
puff pastry ; gluten ; dairy ;
filo|filo pastry|phyllo ; gluten ;
shortcrust pastry ; gluten ; dairy egg ;
pizza dough ; gluten ;
pastry ; gluten ; dairy egg ;

# Legumes and soy
chickpeas|chickpea|garbanzo beans ; ;
lentils|lentil|red lentils|green lentils|brown lentils|puy lentils|black lentils ; ;
dal|dhal|toor dal|tuvar dal|chana dal|moong dal|masoor dal|urad dal ; ;
split peas|yellow split peas ; ;
black beans|kidney beans|red kidney beans|cannellini beans|butter beans|lima beans|borlotti beans|pinto beans|haricot beans|navy beans|black-eyed peas|mung beans|white beans ; ;
baked beans ; nightshade ; allium sulphites ;
refried beans ; ; pork allium dairy ;
edamame ; soy ;
soybeans|soya beans ; soy ;
tofu|firm tofu|silken tofu|extra firm tofu ; soy ;
tempeh ; soy ;
peanuts|peanut|crushed peanuts|roasted peanuts|groundnuts ; peanut ;
peanut butter ; peanut ;

# Nuts and seeds
almonds|almond|flaked almonds|slivered almonds|marcona almonds ; treenut ;
cashews|cashew|cashew nuts ; treenut ;
walnuts|walnut ; treenut ;
pecans|pecan ; treenut ;
pistachios|pistachio ; treenut ;
hazelnuts|hazelnut|filberts ; treenut ;
macadamia|macadamias|macadamia nuts ; treenut ;
brazil nuts|brazil nut ; treenut ;
pine nuts|pine nut|pignoli ; treenut ;
chestnuts|chestnut ; treenut ; ; Chestnut is listed as a tree nut by the FDA.
mixed nuts ; treenut ; peanut ;
almond butter ; treenut ;
cashew butter ; treenut ;
hazelnut spread|chocolate hazelnut spread ; treenut dairy ; soy ;
marzipan ; treenut ; egg ;
praline|pralines ; treenut ; dairy ;
sesame|sesame seeds|sesame seed|toasted sesame seeds|white sesame seeds|black sesame seeds ; sesame ;
tahini|tahina ; sesame ;
sunflower seeds ; ;
pumpkin seeds|pepitas ; ;
chia seeds ; ;
flaxseed|flaxseeds|linseed ; ;
hemp seeds ; ;
poppy seeds ; ;
nigella seeds|kalonji|black onion seeds ; ; ; Nigella seed is not related to onion despite the name.

# Fish
fish|white fish|fish fillets ; fish ;
salmon|salmon fillets|smoked salmon ; fish ;
tuna|tinned tuna|canned tuna ; fish ;
cod ; fish ;
haddock ; fish ;
mackerel ; fish ;
sardines|sardine ; fish ;
anchovies|anchovy|anchovy fillets ; fish ;
trout ; fish ;
sea bass ; fish ;
sea bream ; fish ;
halibut ; fish ;
hake ; fish ;
pollock ; fish ;
tilapia ; fish ;
plaice ; fish ;
sole ; fish ;
swordfish ; fish ;
herring ; fish ;
monkfish ; fish ;
catfish ; fish ;
snapper|red snapper ; fish ;
kippers ; fish ;
fish sauce ; fish ; gluten shellfish ;
anchovy paste ; fish ;
bonito flakes|katsuobushi ; fish ;
dashi ; fish ; ; Dashi is usually made with bonito fish flakes.
caviar|fish roe|roe ; fish ;
worcestershire sauce ; fish allium ; gluten sulphites nightshade ; Worcestershire sauce has anchovies, onion and garlic. UK versions use barley malt vinegar.

# Shellfish
prawns|prawn|king prawns|tiger prawns|raw prawns|cooked prawns ; shellfish ; sulphites ;
shrimp|shrimps ; shellfish ; sulphites ;
crab|crab meat ; shellfish ;
lobster ; shellfish ;
langoustine|langoustines ; shellfish ;
crayfish|crawfish ; shellfish ;
scallops|scallop ; shellfish ;
mussels|mussel ; shellfish ;
clams|clam ; shellfish ;
oysters|oyster ; shellfish ;
squid ; shellfish ;
calamari ; shellfish ; gluten egg ;
octopus ; shellfish ;
cockles ; shellfish ;
scampi ; shellfish ; gluten ;
oyster sauce ; shellfish ; gluten soy fish ;
shrimp paste ; shellfish ;
crab sticks|surimi|imitation crab ; fish shellfish ; egg gluten soy ; Surimi is fish paste and usually has crab extract.

# Meat
chicken|chicken breast|chicken breasts|chicken thighs|chicken thigh|chicken wings|chicken legs|chicken drumsticks|whole chicken|chicken mince ; ;
turkey|turkey breast|turkey mince ; ;
duck|duck breast|duck legs ; ;
lamb|lamb mince|lamb shoulder|lamb leg|lamb chops ; ;
mutton ; ;
goat|goat meat ; ;
venison ; ;
rabbit ; ;
beef|steak|beef steak|sirloin|ribeye|beef mince|minced beef|ground beef|stewing beef|braising steak|brisket|oxtail ; beef ;
veal ; beef ;
mince ; ; beef pork ;
pork|pork belly|pork chops|pork shoulder|pork loin|pork mince|minced pork|pulled pork ; pork ;
bacon|streaky bacon|back bacon|smoked bacon ; pork ;
ham|cooked ham|gammon ; pork ;
prosciutto|parma ham ; pork ;
pancetta ; pork ;
guanciale ; pork ;
chorizo ; pork nightshade ; allium sulphites ;
salami ; pork ; beef allium sulphites ;
pepperoni ; pork nightshade ; beef ;
sausages|sausage ; ; pork beef gluten sulphites allium mustard ;
gelatine|gelatin ; ; pork beef fish ;

# Stocks and gravies
stock|stock cube|stock cubes|bouillon ; ; gluten soy allium nightshade sulphites dairy beef pork ;
chicken stock|chicken broth ; ; gluten soy allium sulphites dairy nightshade ;
vegetable stock|vegetable broth ; ; gluten soy allium nightshade sulphites dairy ;
beef stock|beef broth ; beef ; gluten soy allium sulphites ;
gravy ; ; gluten beef pork allium soy dairy sulphites alcohol ;

# Vegetables
onion|onions|red onion|red onions|white onion|yellow onion|brown onion|sweet onion|pearl onions ; allium ;
spring onion|spring onions|scallion|scallions|green onion|green onions ; allium ;
shallot|shallots ; allium ;
garlic|garlic cloves|garlic clove ; allium ;
leek|leeks ; allium ;
chives|chive ; allium ;
garlic powder|onion powder|granulated garlic ; allium ;
fried onions|crispy onions|fried shallots ; allium ; gluten ;
tomato|tomatoes|cherry tomatoes|plum tomatoes|vine tomatoes|beef tomatoes|beefsteak tomatoes ; nightshade ;
tinned tomatoes|canned tomatoes|chopped tomatoes|tinned chopped tomatoes|passata|tomato passata|tomato puree|tomato paste|crushed tomatoes ; nightshade ;
sun-dried tomatoes ; nightshade ; sulphites ;
potato|potatoes|new potatoes|baby potatoes|maris piper potatoes|russet potatoes ; nightshade ;
aubergine|aubergines|eggplant|eggplants|brinjal ; nightshade ;
bell pepper|bell peppers|red pepper|red peppers|green pepper|yellow pepper|capsicum|peppers|sweet pepper ; nightshade ;
chilli|chillies|chili|chilies|red chilli|green chilli|green chillies|dried red chillies|bird's eye chilli|jalapeno|jalapenos|chilli pepper ; nightshade ;
chilli flakes|red pepper flakes|chili flakes|crushed chilli ; nightshade ;
paprika|smoked paprika|sweet paprika ; nightshade ;
cayenne|cayenne pepper ; nightshade ;
chilli powder|chili powder ; nightshade ; allium ;
kashmiri chilli powder ; nightshade ;
goji berries|goji berry ; nightshade ;
sweet potato|sweet potatoes ; ;
carrot|carrots ; ;
celery|celery sticks|celeriac ; ; ; Celery is an EU allergen that SafePlate does not track.
courgette|courgettes|zucchini ; ;
cucumber|cucumbers ; ;
lettuce|romaine|iceberg lettuce|little gem ; ;
rocket|arugula ; ;
spinach|baby spinach ; ;
kale ; ;
chard|swiss chard ; ;
cabbage|red cabbage|white cabbage|savoy cabbage ; ;
pak choi|bok choy|bok choi ; ;
broccoli|tenderstem broccoli|broccolini ; ;
cauliflower ; ;
brussels sprouts ; ;
asparagus ; ;
peas|frozen peas|garden peas|petit pois ; ;
green beans|french beans|runner beans ; ;
mangetout|snow peas|sugar snap peas ; ;
sweetcorn|corn|corn on the cob ; ;
okra ; ;
mushroom|mushrooms|button mushrooms|chestnut mushrooms|mixed mushrooms|shiitake mushrooms|portobello mushrooms|oyster mushrooms ; ; ; Chestnut and oyster mushrooms are mushrooms, not nuts or shellfish.
butternut squash|squash ; ;
pumpkin ; ;
avocado|avocados ; ;
fennel ; ;
bean sprouts|beansprouts ; ;
beetroot|beets ; ;
radish|radishes ; ;
parsnip|parsnips ; ;
turnip|turnips|swede ; ;
artichoke|artichokes ; ;
artichoke hearts ; ; sulphites ;
watercress ; ;
yam ; ;
cassava ; ;
plantain ; ;
water chestnuts ; ;
bamboo shoots ; ; sulphites ;
olives|black olives|green olives|kalamata olives ; ; sulphites ;
capers ; ; sulphites ;
pickles|gherkins|pickled cucumbers ; ; sulphites mustard allium ;
nori|seaweed|kombu|wakame ; ;

# Fruit
apple|apples ; ;
banana|bananas ; ;
lemon|lemons|lemon zest ; ;
lime|limes|lime zest ; ;
orange|oranges ; ;
grapefruit ; ;
pear|pears ; ;
peach|peaches ; ;
plum|plums ; ;
cherries|cherry ; ;
grapes ; ; sulphites ;
strawberries|strawberry ; ;
raspberries ; ;
blueberries ; ;
blackberries ; ;
mango|mangoes ; ;
pineapple ; ;
papaya ; ;
kiwi ; ;
melon|watermelon ; ;
pomegranate|pomegranate seeds ; ;
dates|medjool dates ; ; sulphites ;
dried apricots ; sulphites ;
raisins|sultanas|currants|dried cranberries|prunes|dried figs|dried fruit|mixed dried fruit ; ; sulphites ;
lemon juice|lime juice ; ; sulphites ; Bottled juice often has added sulphites.
orange juice|apple juice ; ;
tamarind|tamarind paste ; ; sulphites ;

# Herbs and spices
basil|thai basil ; ;
parsley|flat-leaf parsley|curly parsley ; ;
coriander|cilantro|coriander leaves ; ;
mint|mint leaves ; ;
thyme ; ;
rosemary ; ;
oregano|dried oregano ; ;
sage ; ;
dill ; ;
tarragon ; ;
bay leaf|bay leaves ; ;
curry leaves ; ;
lemongrass ; ;
galangal ; ;
kaffir lime leaves|lime leaves ; ;
fenugreek|fenugreek leaves|kasuri methi|methi ; ;
cumin|cumin seeds|ground cumin|jeera ; ;
coriander seed|coriander seeds|ground coriander ; ;
turmeric|ground turmeric|haldi ; ;
ginger|fresh ginger|ground ginger|ginger paste ; ;
cinnamon|cinnamon stick|cinnamon sticks|ground cinnamon ; ;
nutmeg|ground nutmeg ; ; ; Nutmeg is a seed spice, not a tree nut.
mace ; ;
cloves ; ;
cardamom|cardamom pods|green cardamom|elaichi ; ;
star anise ; ;
black pepper|white pepper|peppercorns|ground black pepper ; ; ; Black pepper is not related to chillies or bell peppers.
allspice ; ;
saffron ; ;
fennel seeds ; ;
caraway seeds ; ;
ajwain|carom seeds ; ;
amchur|mango powder ; ;
mustard seeds|mustard seed|black mustard seeds|brown mustard seeds ; mustard ;
garam masala ; ; nightshade ;
curry powder ; nightshade ; mustard gluten allium ;
chinese five spice|five spice ; ;
ras el hanout ; ; nightshade ;
za'atar|zaatar ; sesame ; treenut ;
sumac ; ; treenut ; Sumac is a cousin of cashew and pistachio, so some people with tree nut allergies avoid it.
dukkah ; treenut sesame ; peanut ;
asafoetida|hing ; allium ; gluten ; Asafoetida is used in place of onion and garlic, and is often cut with wheat flour.
salt|sea salt|black salt|kosher salt ; ;
vanilla|vanilla pod|vanilla bean ; ;
vanilla extract ; alcohol ;
almond extract ; alcohol ; treenut ;

# Sweeteners and baking
sugar|caster sugar|granulated sugar|brown sugar|icing sugar|powdered sugar|demerara sugar|muscovado sugar|palm sugar|coconut sugar ; ;
jaggery|gur ; ; sulphites ;
honey ; ;
maple syrup ; ;
golden syrup|corn syrup ; ;
molasses|black treacle|treacle ; ; sulphites ;
agave|agave syrup ; ;
cocoa|cocoa powder ; ;
chocolate chips ; ; dairy soy ;
baking powder ; ; gluten ;
baking soda|bicarbonate of soda ; ;
yeast|dried yeast|instant yeast|fast-action yeast ; ;
nutritional yeast ; ; gluten ;
yeast extract|marmite|vegemite ; gluten ;
jam ; ; sulphites ;

# Sauces and condiments
soy sauce|light soy sauce|dark soy sauce ; soy gluten ;
tamari ; soy ; gluten ;
miso|white miso|red miso|miso paste ; soy ; gluten ;
hoisin sauce|hoisin ; soy ; gluten sesame allium nightshade sulphites ;
teriyaki sauce|teriyaki ; soy gluten ; alcohol sesame allium ;
gochujang ; soy nightshade ; gluten ;
sweet chilli sauce|sweet chili sauce ; nightshade ; allium sulphites ;
sriracha ; nightshade allium ; sulphites ;
hot sauce|tabasco|chilli sauce ; nightshade ; allium sulphites ;
chilli oil|chili oil|chilli crisp ; nightshade ; peanut sesame soy allium ;
sambal oelek|sambal ; nightshade ; allium sulphites shellfish ;
harissa ; nightshade allium ;
ketchup|tomato ketchup ; nightshade ; allium sulphites gluten ;
bbq sauce|barbecue sauce ; nightshade ; allium mustard gluten sulphites soy fish ;
mustard|dijon mustard|dijon|wholegrain mustard|english mustard|yellow mustard ; mustard ; sulphites gluten ;
salsa ; nightshade allium ;
guacamole ; ; allium nightshade ;
pesto|basil pesto ; treenut dairy allium ; ; Pesto is basil, pine nuts, parmesan, garlic and olive oil.
hummus|houmous ; sesame allium ;
tzatziki ; dairy allium ;
raita ; dairy ; allium nightshade ;
curry paste|thai curry paste|red curry paste|green curry paste ; allium nightshade ; shellfish fish peanut treenut gluten soy mustard dairy ; Thai curry pastes often have shrimp paste. Indian pastes can have nuts, mustard or wheat.
tikka paste|korma paste|madras paste|balti paste ; nightshade ; treenut dairy mustard gluten allium peanut ;
satay sauce|peanut sauce ; peanut ; soy fish shellfish gluten allium nightshade ;
tomato sauce|pasta sauce|marinara ; nightshade ; allium dairy sulphites ;
tahini sauce ; sesame ; allium ;
mint sauce ; ; sulphites ;
apple sauce ; ; sulphites ;
cranberry sauce ; ; sulphites alcohol ;

# Vinegars
vinegar|white vinegar|distilled vinegar|spirit vinegar ; ; sulphites ;
rice vinegar|rice wine vinegar ; ; sulphites ;
apple cider vinegar|cider vinegar ; ; sulphites ;
white wine vinegar|red wine vinegar|sherry vinegar ; sulphites ;
balsamic vinegar|balsamic ; sulphites ;
malt vinegar ; gluten ; sulphites ;

# Drinks and alcohol
wine|red wine|white wine|dry white wine|rose wine ; alcohol sulphites ;
cooking wine|rice wine|shaoxing wine ; alcohol ; sulphites gluten ;
sherry|dry sherry ; alcohol sulphites ;
port ; alcohol sulphites ;
vermouth ; alcohol sulphites ;
marsala|marsala wine ; alcohol sulphites ;
mirin ; alcohol ; sulphites ;
sake ; alcohol ; sulphites ;
beer|lager|ale|stout ; alcohol gluten ; sulphites ;
cider ; alcohol ; sulphites ;
brandy|cognac ; alcohol ;
rum|dark rum|white rum ; alcohol ;
vodka ; alcohol ;
gin ; alcohol ;
whisky|whiskey|bourbon ; alcohol ; gluten ;
tequila ; alcohol ;
liqueur ; alcohol ; treenut dairy ;
coconut water ; ; treenut ;
coffee|espresso|instant coffee ; ;
tea|green tea|black tea ; ;
water|sparkling water ; ;
`;

export const FAMILY_WORDS = {
  dairy: 'milk', gluten: 'gluten', peanut: 'peanut', treenut: 'tree nuts', sesame: 'sesame',
  egg: 'egg', soy: 'soy', shellfish: 'shellfish', fish: 'fish', mustard: 'mustard',
  sulphites: 'sulphites', allium: 'onion or garlic', nightshade: 'nightshades',
  pork: 'pork', beef: 'beef', alcohol: 'alcohol',
};

const families = (field) => field.trim().split(/\s+/).filter(Boolean);

export const KNOWN_FOODS = ROWS.split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [names, contains = '', may = '', note = ''] = line.split(';');
    const all = names.split('|').map((n) => n.trim());
    return { name: all[0], names: all, contains: families(contains), may: families(may), note: note.trim() };
  });

const BY_NAME = new Map(KNOWN_FOODS.flatMap((food) => food.names.map((n) => [n, food])));

/** The listed food for a normalised ingredient name, trying simple plurals, or null. */
export function findKnown(readAs) {
  const name = readAs.trim();
  const forms = [name, name.replace(/ies$/, 'y'), name.replace(/es$/, ''), name.replace(/s$/, ''),
    name.replace(/y$/, 'ies'), `${name}es`, `${name}s`];
  for (const form of forms) if (BY_NAME.has(form)) return BY_NAME.get(form);
  return null;
}
