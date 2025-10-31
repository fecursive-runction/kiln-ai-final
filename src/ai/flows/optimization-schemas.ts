import { z } from 'zod';

export const OptimizeCementProductionInputSchema = z.object({
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

// This schema defines the *full* data structure our app will use
export const OptimizeCementProductionOutputSchema = z.object({
  recommendationId: z.string().describe('A unique ID for the recommendation, e.g., "REC-20240521-001".'),
  feedRateSetpoint: z.number().describe('A number representing the recommended feed rate setpoint in tons per hour.'),
  limestoneAdjustment: z.string().describe('Recommended adjustment to the limestone feed (source of CaO), as a string e.g., "+2%" or "-1.5%".'),
  clayAdjustment: z.string().describe('Recommended adjustment to the clay/shale feed (source of SiO2/Al2O3), as a string e.g., "-1%" or "+0.5%".'),
  predictedLSF: z.number().describe('The predicted LSF after the adjustments are made. This should be a number.'),
  explanation: z.string().describe('A clear, concise explanation for the recommendation. Explain the trade-offs involved, particularly how adjustments to the raw mix (limestone for CaO, clay for SiO2/Al2O3) affect the LSF to bring it into the ideal range of 94-98%.'),
});
export type OptimizeCementProductionOutput = z.infer<typeof OptimizeCementProductionOutputSchema>;


// This schema defines what we will ask the AI to generate.
// We have OMITTED 'predictedLSF' to make the AI much faster.
export const AIGenerationSchema = OptimizeCementProductionOutputSchema.omit({ 
  predictedLSF: true 
});
export type AIGenerationOutput = z.infer<typeof AIGenerationSchema>;