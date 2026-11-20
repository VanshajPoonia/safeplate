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
// "Close in meaning to soy sauce. Soy sauce is usually brewed with wheat."
```

The first call loads the bge-small-en-v1.5 model (35 MB, q8) and keeps it. Tested on Node 24
and 26, and in the browser through the SafePlate app. On 30 labelled allergens under unusual names it flags 29, with 1 false
alarm on 24 safe ingredients. It is noisier when many allergens are watched at once.

Full docs, the result format and the measurements:
https://github.com/VanshajPoonia/safeplate/blob/main/docs/API.md

MIT licensed. The model weights are MIT from BAAI, served by the Hugging Face Hub.
