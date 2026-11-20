// Reproduces the measurement quoted in the README, through the same library the app and
// the API use. Runs the real model on the real fixtures. No mocks.
import { createChecker, DEFAULT_MODEL } from '../lib/index.js';
import { evaluate } from './eval.mjs';

const model = process.env.MODEL || DEFAULT_MODEL;
const checker = await createChecker({ model, dtype: process.env.DTYPE });
await evaluate(checker, `model: ${model} (${checker.dtype}, ${checker.device})`);
