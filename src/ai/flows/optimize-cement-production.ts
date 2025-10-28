
'use server';

/**
 * @fileOverview AI-powered optimization recommendations for cement production.
 * 
 * - optimizeCementProduction - A function that handles the cement production optimization process.
 * - OptimizeCementProductionInput - The input type for the optimizeCementProduction function.
 * - OptimizeCementProductionOutput - The return type for the optimizeCementProduction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const OptimizeCementProductionInputSchema = z.object({
  plantId: z.string().describe('The ID of the cement plant.'),
  kilnTemperature: z.number().describe('The current temperature of the kiln in degrees Celsius.'),
  feedRate: z.number().describe('The current feed rate of raw materials in tons per hour.'),
  lsf: z.number().describe('The current Lime Saturation Factor (LSF) of the raw mix.'),
  cao: z.number().describe('The current percentage of CaO in the raw mix.'),
  sio2: z.number().describe('The current percentage of SiO2 in the raw mix.'),
  al2o3: z.number().describe('The current percentage of Al2O3 in the raw mix.'),
  fe2o3: z.number().describe('The current percentage of Fe2O3 in the raw mix.'),
  constraints: z.array(z.string()).describe('A list of operational constraints (e.g., "LSF must be above 94%", "temperature must not exceed 1500C").'),
});
export type OptimizeCementProductionInput = z.infer<typeof OptimizeCementProductionInputSchema>;

const OptimizeCementProductionOutputSchema = z.object({
  recommendationId: z.string().describe('A unique ID for the recommendation, e.g., "REC-20240521-001".'),
  feedRateSetpoint: z.number().describe('A number representing the recommended feed rate setpoint in tons per hour.'),
  limestoneAdjustment: z.string().describe('Recommended adjustment to the limestone feed (source of CaO), as a string e.g., "+2%" or "-1.5%".'),
  clayAdjustment: z.string().describe('Recommended adjustment to the clay/shale feed (source of SiO2/Al2O3), as a string e.g., "-1%" or "+0.5%".'),
  predictedLSF: z.number().describe('The predicted LSF after the adjustments are made. This should be a number.'),
  explanation: z.string().describe('A clear, concise explanation for the recommendation. Explain the trade-offs involved, particularly how adjustments to the raw mix (limestone for CaO, clay for SiO2/Al2O3) affect the LSF to bring it into the ideal range of 94-98%.'),
});
export type OptimizeCementProductionOutput = z.infer<typeof OptimizeCementProductionOutputSchema>;

export async function optimizeCementProduction(input: OptimizeCementProductionInput): Promise<OptimizeCementProductionOutput> {
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
    3.  Calculate the predicted LSF that would result from your recommended adjustments.
    4.  Generate a clear explanation of why these changes are recommended, explaining the trade-offs involved in adjusting the raw mix to achieve the target LSF.
    
    Generate a unique ID for this recommendation (e.g., REC-YYYYMMDD-HHMMSS).

    ONLY output a valid JSON object matching the output schema. Ensure all numeric fields are actual numbers, not strings.
    `,
    output: {
      schema: OptimizeCementProductionOutputSchema,
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
