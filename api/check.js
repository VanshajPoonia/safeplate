// POST /api/check. JSON in, JSON out. Runs the same library as the app, on the server.
import { createChecker, parseIngredients, resolveAllergens, ALLERGENS, SEVERITY, DISCLAIMER } from '../lib/index.js';

export const LIMITS = { bodyBytes: 32000, ingredients: 200, lineChars: 200, allergens: 30 };
const DOCS = 'https://github.com/VanshajPoonia/safeplate/blob/main/docs/API.md';

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const fail = (status, error) => json(status, { error, docs: DOCS, disclaimer: DISCLAIMER });

// One model per warm instance. Vercel's file system is read-only apart from /tmp.
let checker = null;
function getChecker() {
  checker ??= createChecker({ cacheDir: process.env.VERCEL ? '/tmp/safeplate-models' : undefined })
    .catch((err) => {
      checker = null;
      throw err;
    });
  return checker;
}

/** Returns an error message for a bad request body, or null if it is fine. */
export function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Send a JSON object with ingredients and allergens.';
  const { ingredients, allergens } = body;
  const lines = Array.isArray(ingredients) ? ingredients : typeof ingredients === 'string' ? ingredients.split('\n') : null;
  if (!lines) return 'ingredients must be a string or an array of strings.';
  if (lines.some((l) => typeof l !== 'string')) return 'Every ingredient must be a string.';
  if (lines.length > LIMITS.ingredients) return `Send at most ${LIMITS.ingredients} ingredients per request.`;
  if (lines.some((l) => l.length > LIMITS.lineChars)) return `Keep each ingredient under ${LIMITS.lineChars} characters.`;
  if (!parseIngredients(lines).length) return 'No ingredients found.';
  if (!Array.isArray(allergens) || !allergens.length) return 'allergens must be a non-empty array, like ["dairy", "sesame"].';
  if (allergens.length > LIMITS.allergens) return `Send at most ${LIMITS.allergens} allergens per request.`;
  try {
    resolveAllergens(allergens);
  } catch (err) {
    return err.message;
  }
  return null;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export function GET() {
  return json(200, {
    usage: 'POST a JSON body like {"ingredients": ["200 g labneh"], "allergens": ["dairy"]} to this URL.',
    docs: DOCS,
    allergens: ALLERGENS,
    severities: Object.keys(SEVERITY),
    limits: LIMITS,
    disclaimer: DISCLAIMER,
  });
}

export async function POST(request) {
  const raw = await request.text();
  if (raw.length > LIMITS.bodyBytes) return fail(413, `Keep the body under ${LIMITS.bodyBytes} bytes.`);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, 'The body is not valid JSON.');
  }
  const problem = validate(body);
  if (problem) return fail(400, problem);
  try {
    const result = await (await getChecker()).check(body.ingredients, body.allergens);
    return json(200, result);
  } catch (err) {
    console.error('check failed', err);
    return fail(500, 'The check failed on our side. Try again.');
  }
}
