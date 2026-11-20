// The HTTP API: handlers called directly, then one real round trip over a local server.
import assert from 'node:assert/strict';
import { GET, POST, OPTIONS, LIMITS } from '../api/check.js';
import { apiServer } from '../scripts/api-server.mjs';
import { DISCLAIMER } from '../lib/index.js';

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}\n     ${err.message}`);
  }
}

const post = (body) => POST(new Request('http://localhost/api/check', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
}));

await test('GET describes the API and carries the disclaimer', async () => {
  const res = GET();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.allergens.length, 16);
  assert.equal(body.disclaimer, DISCLAIMER);
});

await test('OPTIONS answers a CORS preflight', () => {
  const res = OPTIONS();
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

await test('POST flags a dish with a reason on every flag', async () => {
  const res = await post({
    ingredients: ['200 g labneh', '2 tbsp light soy sauce', '2 tsp nutmeg', '1 lemon'],
    allergens: ['dairy', 'gluten', 'tree nuts', { allergen: 'sesame', severity: 'anaphylactic' }],
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  const body = await res.json();
  assert.equal(body.verdict, 'unsafe');
  assert.equal(body.disclaimer, DISCLAIMER);
  assert.equal(body.ingredients.length, 4);
  const soy = body.ingredients[1].flags.find((f) => f.allergen === 'gluten');
  assert.equal(soy.level, 'danger');
  assert.equal(soy.reason, 'Close in meaning to soy sauce. Soy sauce is usually brewed with wheat.');
  assert.equal(body.ingredients[2].excused.find((e) => e.allergen === 'treenut').reason, 'A seed spice, not a tree nut.');
  for (const ing of body.ingredients) for (const f of ing.flags) assert.ok(f.reason.length > 10, f.allergen);
});

await test('POST takes a pasted list as one string', async () => {
  const body = await (await post({ ingredients: 'casein\n1 carrot', allergens: ['milk'] })).json();
  assert.equal(body.ingredients[0].flags[0].reason, 'Casein is a milk protein.');
  assert.deepEqual(body.allergens, ['dairy']);
});

await test('bad requests get a 400 with a message and the disclaimer', async () => {
  const cases = [
    ['not json', /not valid JSON/],
    [[], /JSON object/],
    [{ allergens: ['dairy'] }, /ingredients must be/],
    [{ ingredients: ['milk'] }, /allergens must be/],
    [{ ingredients: ['milk'], allergens: [] }, /allergens must be/],
    [{ ingredients: [42], allergens: ['dairy'] }, /must be a string/],
    [{ ingredients: ['  '], allergens: ['dairy'] }, /No ingredients/],
    [{ ingredients: ['milk'], allergens: [{ allergen: 'dairy', severity: 'deadly' }] }, /Unknown severity/],
    [{ ingredients: Array(LIMITS.ingredients + 1).fill('milk'), allergens: ['dairy'] }, /at most 200 ingredients/],
    [{ ingredients: ['x'.repeat(LIMITS.lineChars + 1)], allergens: ['dairy'] }, /under 200 characters/],
  ];
  for (const [input, message] of cases) {
    const res = await post(input);
    const body = await res.json();
    assert.equal(res.status, 400, JSON.stringify(input).slice(0, 60));
    assert.match(body.error, message);
    assert.equal(body.disclaimer, DISCLAIMER);
  }
});

await test('an oversized body gets a 413', async () => {
  const res = await post({ ingredients: 'milk\n'.repeat(8000), allergens: ['dairy'] });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).disclaimer, DISCLAIMER);
});

await test('a real HTTP round trip through the local server', async () => {
  const server = apiServer().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const url = `http://localhost:${server.address().port}/api/check`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ingredients: ['2 tbsp gomasio', 'basmati rice'], allergens: ['sesame'] }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.verdict, 'unsafe');
    assert.equal(body.ingredients[0].flags[0].reason, 'Close in meaning to gomashio. Gomashio is toasted sesame seeds with salt.');
    assert.deepEqual(body.ingredients[1].flags, []);
    assert.equal(body.disclaimer, DISCLAIMER);
    assert.equal((await fetch(url.replace('/api/check', '/nope'))).status, 404);
  } finally {
    server.close();
  }
});

if (failed) {
  console.error(`\n${failed} API test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('\napi: PASS');
}
