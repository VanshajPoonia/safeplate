# SafePlate API

Check an ingredient list against a guest's allergens. Every flag comes with a plain reason you
can show to staff or a customer, like "Casein is a milk protein."

> **SafePlate is a warning aid, not a guarantee and not medical advice.** It can miss an
> allergen, and it cannot see cross-contact, shared equipment or recipe changes. A clear result
> does not mean a dish is safe. Every response carries this notice in a `disclaimer` field.
> Show it next to the result, and keep your own allergen records as the source of truth.

There are two ways to use it. Both give the same answer, because the API runs the library.

- **HTTP API.** `POST https://safeplate-theta.vercel.app/api/check`
- **JS library.** Runs in the browser or in Node, so ingredient lists never leave your system.

## HTTP API

### Request

`POST /api/check` with a JSON body.

```bash
curl -X POST https://safeplate-theta.vercel.app/api/check \
  -H 'content-type: application/json' \
  -d '{
    "ingredients": ["1 tbsp light soy sauce", "2 tsp nutmeg", "1 cucumber"],
    "allergens": ["gluten", {"allergen": "tree nuts", "severity": "anaphylactic"}]
  }'
```

| Field | Type | What to send |
|---|---|---|
| `ingredients` | array of strings, or one string | One ingredient per item, or a pasted list with one per line. Quantities and prep words are fine: "2 tbsp finely chopped parsley" is read as "parsley". |
| `allergens` | array | What the guest must avoid. A family key (`"dairy"`), a family label (`"Tree nuts"`), a common alias (`"milk"`, `"wheat"`, `"eggs"`) or any other ingredient name (`"mango"`). Each item can be a string or `{"allergen": "...", "severity": "..."}`. |

Families: `dairy`, `gluten`, `peanut`, `treenut`, `sesame`, `egg`, `soy`, `shellfish`, `fish`,
`mustard`, `sulphites`, `allium` (onion and garlic), `nightshade`, `pork`, `beef`, `alcohol`.
`GET /api/check` returns the same list with labels and default severities.

Severities: `anaphylactic`, `severe`, `moderate`, `mild`, `avoid`. Each family has a default.
`mild` and `avoid` turn a strong match into level `avoid` instead of `danger`.

A name that is not a family, like `"mango"` or `"carmine"`, is watched as its own term and
matched by meaning, the same way as the families.

### Response

The real answer to the request above:

```json
{
  "verdict": "unsafe",
  "allergens": [
    "gluten"
  ],
  "ingredients": [
    {
      "text": "1 tbsp light soy sauce",
      "readAs": "light soy sauce",
      "flags": [
        {
          "allergen": "gluten",
          "label": "Gluten / wheat",
          "level": "danger",
          "severity": "severe",
          "reason": "Close in meaning to soy sauce. Soy sauce is usually brewed with wheat.",
          "matched": "soy sauce",
          "hidden": false,
          "similarity": 0.86,
          "margin": 0.24
        }
      ],
      "excused": []
    },
    {
      "text": "2 tsp nutmeg",
      "readAs": "nutmeg",
      "flags": [
        {
          "allergen": "gluten",
          "label": "Gluten / wheat",
          "level": "caution",
          "severity": "severe",
          "reason": "Closer to malt than to everyday foods. Malt is usually made from barley, which contains gluten. Worth checking the label.",
          "matched": "malt",
          "hidden": false,
          "similarity": 0.588,
          "margin": 0.002
        }
      ],
      "excused": [
        {
          "allergen": "treenut",
          "label": "Tree nuts",
          "matched": "nutmeg",
          "reason": "A seed spice, not a tree nut."
        }
      ]
    },
    {
      "text": "1 cucumber",
      "readAs": "cucumber",
      "flags": [],
      "excused": []
    }
  ],
  "model": "Xenova/bge-small-en-v1.5",
  "disclaimer": "SafePlate is a warning aid. It is not a guarantee and not medical advice. It can miss an allergen, and it cannot see cross-contact, shared equipment or recipe changes. A clear result does not mean a dish is safe. Check the label and ask the kitchen."
}
```

Every line you send comes back, in order.

| Field | Meaning |
|---|---|
| `verdict` | `unsafe` if any flag is `danger`. `check` if the worst is `caution`. `avoid` if only `avoid` flags. `safe` if nothing was flagged. `safe` is not a promise. |
| `allergens` | The allergens with at least one flag, most serious first. |
| `ingredients[].readAs` | What the model actually compared, after stripping quantities and prep words. Show it when a result looks odd. |
| `flags[].level` | `danger`: reads as the allergen. `caution`: closer to the allergen than to everyday food, worth a label check. `avoid`: a strong match on a `mild` or `avoid` severity. |
| `flags[].reason` | One or two plain sentences: what it matched and the fact behind it. Safe to show to customers. |
| `flags[].matched` | The seed term it matched, like `soy sauce` or `casein`. |
| `flags[].hidden` | `true` when the match is a hidden source, like burger buns for sesame. |
| `flags[].similarity`, `margin` | Raw scores. `margin` is similarity to the allergen minus similarity to everyday food. Higher is a stronger match. |
| `excused` | Matches the false-friend guard cleared, with the reason. Coconut milk is not dairy. Nutmeg is not a tree nut. |

### How to show the levels

Treat `danger` as "do not serve without checking the recipe". Treat `caution` as "ask the
kitchen". `caution` is noisy when you watch many allergens at once.

Measured on a held-out set of 132 labelled ingredients, each checked against all 16 families
(`node tests/multi.mjs`):

| | Share |
|---|---|
| Allergens present that get a flag | 89% (19% as `danger` or `avoid`) |
| Absent allergens that still get a `caution` flag | 61% |
| Absent allergens that get a `danger` or `avoid` flag | 2% |

Checked against the nine major allergens, 28 of 40 everyday ingredients got some flag and 1
got a `danger` flag, courgette as gluten (`node tests/noise.mjs`). So a clean result is rare
when many allergens are watched, and a `caution` flag on its own is weak evidence.

On the labelled fixture set, checking one allergen per ingredient, it flags 29 of 30 real
allergens with 1 false alarm. `npm test` reproduces that.

### Errors

Errors have an `error` message, a `docs` link and the `disclaimer`.

| Status | When |
|---|---|
| 400 | The body is not JSON, a field is missing or the wrong type, a severity is unknown, or no ingredients were found. |
| 413 | The body is over 32 KB. |
| 500 | The check failed on the server. Retry once. |

### Limits

200 ingredients a request, 200 characters an ingredient, 30 allergens a request, 32 KB a body.
There are no API keys or rate limits yet, so do not build on the public URL for production.
CORS is open, so a browser can call it directly.

### Speed

Measured on a Vercel preview in Washington (iad1, 2 GB and 1 vCPU), with a 10-line dish
against 4 allergens:

- Cold start: 0.5 to 1.7 s to load the model over four measured cold starts, then 92 to
  127 ms for the first check. The model ships inside the function, so a cold start never
  calls the Hugging Face Hub.
- Warm: 2 to 14 ms for the check.

Every 200 response has a `server-timing` header with both parts, like
`model;dur=0, check;dur=6`. The network time to you comes on top.

## JS library

Tested on Node 24 and 26. In Node it needs `@huggingface/transformers` 3.x installed.
In the browser it loads transformers.js 3.7.5 from jsDelivr and the 35 MB model from the
Hugging Face Hub, then caches both. It is on npm as [`safeplate`](https://www.npmjs.com/package/safeplate).

```bash
npm install safeplate @huggingface/transformers
```

```js
import { check } from 'safeplate';

const result = await check(
  ['200 g halloumi', '1 tbsp light soy sauce', '2 tsp nutmeg'],
  ['dairy', 'gluten', 'tree nuts'],
);
result.ingredients[1].flags[0].reason;
// "Close in meaning to soy sauce. Soy sauce is usually brewed with wheat."
```

`check()` loads the model once and reuses it. For more control:

```js
import { createChecker, ALLERGENS, DISCLAIMER } from 'safeplate';

const checker = await createChecker({ onProgress: (p) => console.log(p.status) });
const result = await checker.check(menuItem.ingredients, guest.allergens);
```

The result is the same object the API returns. `ALLERGENS` lists the families.
`DISCLAIMER` is the notice to show with any result.

Options for `createChecker`: `model`, `dtype` (default `q8`), `device` (default `cpu` in Node,
`wasm` in the browser), `cacheDir`, `onProgress`, and `precomputed: false` to embed the seed
vocabulary live. The thresholds were measured on `Xenova/bge-small-en-v1.5` at `q8`. Other
models or dtypes give different numbers, so run `npm test` before trusting them.
