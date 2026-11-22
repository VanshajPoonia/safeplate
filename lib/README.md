# safeplate

Flags allergens in an ingredient list by meaning, not spelling, so it catches names nobody put on
a list, like labneh, surimi or panko. Every flag comes with a plain reason, like "Casein is a
milk protein."

**This is a warning aid, not a guarantee and not medical advice.** It can miss an allergen, and
it cannot see cross-contact, shared equipment or recipe changes. A clear result does not mean a
dish is safe. Every result carries this notice in a `disclaimer` field. Show it with the result.

```bash
npm install safeplate @huggingface/transformers
```

```js
import { check } from 'safeplate';

const result = await check(['1 tbsp light soy sauce', '2 tsp nutmeg'], ['gluten', 'tree nuts']);
result.ingredients[0].flags[0].reason;
// "Soy sauce is usually brewed with wheat."
```

453 common foods have a hand-written answer per allergen family and are checked first. Every
other name goes to the bge-small-en-v1.5 model (35 MB, q8), which the first call loads and keeps.
Tested on Node 24 and 26, and in the browser through the SafePlate app.

On 30 labelled allergens under unusual names the model flags 29, with 1 false alarm on 24 safe
ingredients. On 132 held-out ingredients checked against all 16 families, the list and the model
together catch 91% of the allergens and flag 41% of the absent ones. The model alone flags 63%.
Names the list does not cover are still noisy.

Full docs, the result format and the measurements:
https://github.com/VanshajPoonia/safeplate/blob/main/docs/API.md

MIT licensed. The model weights are MIT from BAAI, served by the Hugging Face Hub.
