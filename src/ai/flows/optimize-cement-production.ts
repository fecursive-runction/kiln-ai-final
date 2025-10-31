'use server';

/**
 * @fileOverview AI-powered optimization recommendations for cement production.
 * * - optimizeCementProduction - A function that handles the cement production optimization process.
 */

import {ai} from '@/ai/genkit';
// *** MODIFIED ***
// Import schemas and types from the new non-server file
import { 
  type OptimizeCementProductionInput,
  type AIGenerationOutput,
  AIGenerationSchema 
} from './optimization-schemas';

// *** REMOVED ALL ZOD SCHEMA AND TYPE EXPORTS FROM THIS FILE ***

export async function optimizeCementProduction(input: OptimizeCementProductionInput): Promise<AIGenerationOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are an expert AI process engineer for a cement plant. Your task is to provide optimal operational setpoints AND an explanation based on real-time data. The primary goal is to bring the Lime Saturation Factor (LSF) into the ideal range of 94-98%.

    Current Plant State (Plant ID: ${input.plantId}):
    - Kiln Temperature: ${input.kilnTemperature} °C
    - Raw Material Feed Rate: ${input.feedRate} tons/hour
    - Raw Mix Composition:
        - CaO: ${input.cao}%
        - SiO2: ${input.sio2}%
        - Al2O3: ${input.al2o3}%
        - Fe2O3: ${input.fe2o3}%
    - Current LSF: ${input.lsf}%

    Operational Constraints:
    ${input.constraints.map(c => `- ${c}`).join('\n')}

    Your tasks:
    1.  Recommend adjustments to the raw material feed (limestone and clay/shale) to correct the LSF. Limestone is the primary source of CaO. Clay/shale is the primary source of SiO2 and Al2O3.
    2.  Recommend a new overall feed rate setpoint.
    3.  Generate a clear explanation of why these changes are recommended, explaining the trade-offs involved in adjusting the raw mix to achieve the target LSF.
    
    Generate a unique ID for this recommendation (e.g., REC-YYYYMMDD-HHMMSS).
    
    **DO NOT** calculate the predicted LSF. You only need to provide the adjustments.
    ONLY output a valid JSON object matching the output schema.
    `,
    output: {
      // *** MODIFIED ***
      // Use the imported schema
      schema: AIGenerationSchema,
    },
    config: {
        temperature: 0.2,
    }
  });

  if (!output) {
    throw new Error('AI failed to generate a recommendation.');
  }

  return output;
}