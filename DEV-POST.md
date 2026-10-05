---
title: "My first design caught 7 allergens out of 30. One subtraction took it to 29."
tags: devchallenge, weekendchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01)*

## What I Built

**SafePlate** is an allergy-aware meal planner that catches ingredient names nobody put on a list.
It runs entirely on your own device.

<!-- TODO: replace with the real person — their name, your actual relationship, their real
     allergies. The judges asked for one real person, and the specifics are what make this land. -->

My flatmate is allergic to sesame and dairy. Cooking for them was fine right up until the evening I
nearly served something with *kataifi* in it, because I did not know kataifi was pastry, and the
thing I was carefully watching for was sesame.

Every tool I could find was a keyword list. Keyword lists only catch the words somebody already
thought of, and the words that hurt you are the ones nobody thought of: *labneh*, *surimi*,
*gomasio*, *panko*, *freekeh*, *pignoli*.

SafePlate compares **meaning** instead of spelling. None of those six words appear anywhere in my
vocabulary file, and all six get flagged.

## Demo

**[vanshajpoonia.github.io/safeplate](https://vanshajpoonia.github.io/safeplate/)**

Tick *Dairy*, *Gluten*, *Sesame*, *Shellfish* and *Tree nuts*, save, go to **Check a recipe** and
press **Load the hard examples**. Every line in there is either a real allergen under an unusual
name, or a safe ingredient that reads like an allergen (`coconut milk`, `nutmeg`, `cocoa butter`,
`buckwheat flour`).

Then open the Network tab and watch nothing happen. The profile is medical information about
someone else; it stays in `localStorage` and the inference happens in the tab.

<!-- TODO: screen recording of the scan result would be the single highest-value addition here. -->

## Code

{% embed https://github.com/VanshajPoonia/safeplate %}

MIT. Zero runtime dependencies. `npm test` reproduces every number in this post.

## How I Built It

**bge-small-en-v1.5** (MIT, from BAAI), ~35 MB quantised, running in the browser tab via
[transformers.js](https://github.com/huggingface/transformers.js).

But the model is not the interesting part. **The decision rule is**, and I got it badly wrong first.

### The version that did not work

The obvious design: embed the ingredient, embed `cheese`, flag it if cosine similarity clears some
threshold. I built that, then built a fixture set of 54 labelled ingredients to pick the threshold
with. The fixture set told me the design was broken:

```
burrata    -> mozzarella   0.43     should flag
rice flour -> flour        0.83     should NOT flag
tomato     -> pasta        0.55     should NOT flag
```

There is no number that puts `burrata` on one side and `rice flour` on the other. At the **best
possible** cut-off, that version caught **7 of 30** allergens.

I want to be clear about how bad a failure that is, because it would not have *looked* like one. The
app would have confidently cleared three quarters of the dangerous ingredients I showed it, and a
casual demo — type `tahini`, watch it light up red — would have passed.

### The fix is a subtraction

The cause is that sentence-embedding spaces are anisotropic: any two foods are already similar to
each other, so the absolute number carries almost no signal. Stop reading it.

Every ingredient is now also scored against `CONTROL_FOODS` — thirty ordinary, non-allergenic
ingredients like carrot, rice, chicken, lemon. What gets thresholded is the **margin**:

```js
margin = similarity(ingredient, allergen family) - similarity(ingredient, ordinary food)
```

`tomato` sits closer to ordinary food than to gluten, so its margin is negative and it passes.
`kataifi pastry` sits closer to pastry than to anything in the control set, so it flags.

Same model. Same vocabulary. One subtraction. **7 of 30 became 27 of 30.**

### Only then was it worth comparing models

| | all-MiniLM-L6-v2 | **bge-small-en-v1.5** |
|---|---|---|
| Size (q8) | 22 MB | 35 MB |
| Allergens flagged | 27/30 | **29/30** |
| False alarms | 4 | **1** |
| Danger-level false alarms | 1 (`buckwheat flour` → gluten) | **0** |

Note that recall barely moved. What moved was MiniLM confidently telling someone with coeliac
disease that buckwheat flour contains gluten. A tool you trust with an allergy survives being
cautious; it does not survive being confidently wrong. 13 MB is cheap for that column.

### The other hard part: false friends

A language model is certain that **coconut milk** is dairy. Being wrong in that direction is nearly
as costly as a miss, because a planner that flags everything gets ignored by Wednesday.

So there is an explicit `FALSE_FRIENDS` table — coconut milk, almond flour, buckwheat, nutmeg,
eggplant, cocoa butter, nutritional yeast — each naming the family it must *not* trigger and the
reason, which is shown to the user rather than silently suppressed:

> ✓ Coconut milk contains no dairy.

An ingredient can be excused from `dairy` while still flagging `treenut`, which is exactly what
almond milk should do. In the test run the guard excuses 7 of the 8 ingredients that would otherwise
have tripped.

**Final numbers: 29 of 30 allergens flagged, 1 false alarm across 24 safe ingredients.**

## Why Does Open Innovation Matter?

I could have written the usual answer — private, free, offline, all true here — before building
anything. What I did not expect is that **open weights are what stopped me shipping the broken
version.**

Finding the margin trick took a few hundred runs over the fixture set, then a few hundred more per
candidate model. Offline, in a loop, with no bill and no rate limit. That is what let me see that
`rice flour` was scoring *higher* than `burrata`.

A hosted classifier would have handed me a label and hidden the score. I would have typed `tahini`,
seen the red badge, and shipped a tool that missed three quarters of what it claimed to catch — for
someone whose reaction to getting it wrong is medical. The failure would have been invisible
precisely because the API was doing the deciding.

That is also why the similarity score sits on screen next to every hit. Someone deciding what to
feed a friend should be able to see how confident the machine actually is. You can only show a
number you are allowed to see.

The privacy argument is still the one I would lead with to a non-engineer — there is no good reason
for a friend's medical information to be on anyone's server when the whole computation is 35 MB of
weights and 40 ms of arithmetic. But the argument that changed the *code* was being able to measure
my own idea and find out it was wrong.

**This is a cooking aid, not a medical device.** It catches things you would have missed. It does
not catch everything, and it cannot see a shared fryer. Read the label.

## My Agent Session

<!-- TODO: save the session with DevRelay and embed it with the agent_session tag, or link it. -->

## Prize Categories

<!-- TODO: list the partner categories you are entering, or delete this section. -->
