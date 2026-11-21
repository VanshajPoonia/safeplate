// Puts the pinned q8 model in node_modules/.cache/safeplate-model for the API.
// Vercel runs it as the build command. Files already there with the right hash are kept.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { MODEL_DIR, MODEL_ID, MODEL_REVISION, MODEL_FILES } from '../api/_model.js';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function readIfValid(path, hash) {
  try {
    const buf = await readFile(path);
    return sha256(buf) === hash ? buf : null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

let fetched = 0;
for (const [file, hash] of Object.entries(MODEL_FILES)) {
  const path = join(MODEL_DIR, MODEL_ID, file);
  if (await readIfValid(path, hash)) continue;
  const url = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha256(buf) !== hash) throw new Error(`${file}: sha256 does not match the pinned model`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  fetched++;
}
console.log(`model: ${MODEL_ID}@${MODEL_REVISION.slice(0, 7)} in ${MODEL_DIR} (${fetched} downloaded)`);
