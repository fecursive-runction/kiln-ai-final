import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const alertsAI = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY_ALERTS }),
  ],
});

export const optimizerAI = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY_OPTIMIZER }),
  ],
});

export const plantGPTAI = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY_PLANTGPT }),
  ],
});
