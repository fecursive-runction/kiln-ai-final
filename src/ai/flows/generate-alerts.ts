'use server';

import { alertsAI as ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateAlertsInputSchema = z.object({
  kilnTemperature: z.number().describe('The current temperature of the kiln in degrees Celsius.'),
  lsf: z.number().describe('The current Lime Saturation Factor (LSF) of the raw mix.'),
});
export type GenerateAlertsInput = z.infer<typeof GenerateAlertsInputSchema>;


const AlertSchema = z.object({
    severity: z.enum(['CRITICAL', 'WARNING']).describe("The severity of the alert."),
    message: z.string().describe("The alert message, explaining the issue."),
});

const GenerateAlertsOutputSchema = z.object({
    alerts: z.array(AlertSchema).describe("An array of generated alerts. MUST be an empty array if no alerts are warranted."),
});
export type GenerateAlertsOutput = z.infer<typeof GenerateAlertsOutputSchema>;


export async function generateAlerts(input: GenerateAlertsInput): Promise<GenerateAlertsOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-lite',
      prompt: `You are an AI monitoring system for a cement plant. Your task is to generate alerts based on the following live data.
    
      Current Plant State:
      - Kiln Temperature: ${input.kilnTemperature} °C
      - Lime Saturation Factor (LSF): ${input.lsf} %
    
      Your rules for generating alerts are:
      - Ideal Kiln Temperature is between 1430°C and 1470°C.
      - Ideal Lime Saturation Factor (LSF) is between 94% and 98%.
      
      Generate alerts ONLY for the following conditions:
      - CRITICAL Alert: If Kiln Temperature > 1480°C or < 1420°C. Message should reflect the extreme temperature. Also check the Optimiser inputs and adjust accordingly for Critical alerts. For example, if the requested temperature is 1490 degrees C, then critical error should at least be around 30 degrees more and for 100 degrees less.
      - WARNING Alert: If Kiln Temperature is between 1470-1480°C or 1420-1430°C. Also check the Optimiser inputs and adjust accordingly for Critical alerts. For example, if the requested temperature is 1490 degrees C, then warning error should at least be around 15 degrees more and 50 degrees less.
      - WARNING Alert: If LSF is below 94 or above 98. Message should indicate the LSF is out of spec and might affect clinker quality.
      
      If all metrics are within their ideal ranges, you MUST return an empty array for the 'alerts' field.
      Do NOT generate INFO alerts.
      ONLY output a valid JSON object matching the output schema.
      `,
      output: {
        schema: GenerateAlertsOutputSchema,
      },
      config: {
        temperature: 0.1,
      }
    });

    if (!output) {
      console.error('AI failed to generate a valid output.');
      return { alerts: [] };
    }

    return output;
  } catch (error) {
    console.error('Error generating AI alerts:', error);
    return { alerts: [] };
  }
}