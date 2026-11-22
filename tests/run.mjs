// Reproduces the measurement quoted in the README, through the same library the app and
// the API use. Runs the real model on the real fixtures. No mocks.
import { createChecker, DEFAULT_MODEL } from '../lib/index.js';
import { evaluate } from './eval.mjs';

const model = process.env.MODEL || DEFAULT_MODEL;
// KNOWN=0 skips the curated food list, to see what the model alone gets.
const knownFoods = process.env.KNOWN !== '0';
const checker = await createChecker({ model, dtype: process.env.DTYPE, knownFoods });
await evaluate(checker, `model: ${model} (${checker.dtype}, ${checker.device}), food list ${knownFoods ? 'on' : 'off'}`);
