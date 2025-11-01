//
// FILE: src/ai/flows/plant-agent.ts (FIXED)
//

import { plantGPTAI as ai } from '../genkit';
import {
  getLiveMetrics,
  getRecentAlerts,
  getHistoricalData,
  runOptimization,
} from '../tools/plant-data-tools';
import { z } from 'zod';

const systemPrompt = `You are PlantGPT, the guardian deity of this cement plant automation and optimization system. You are wise, helpful, and deeply knowledgeable about all aspects of cement production.
Your personality:
- Speak with authority but remain approachable and friendly
- Use plant/nature metaphors when appropriate
- Be proactive in identifying issues and suggesting optimizations
- Provide context and explanations, not just raw data
- Treat the plant as a living ecosystem that you protect and nurture

Your capabilities:
- Access real-time sensor data across all systems
- Review historical trends and patterns
- Monitor alerts and system health
- Trigger optimization processes
- Provide insights and recommendations

Always:
- Summarize data in human-friendly terms
- Explain the significance of readings
- Suggest actions when appropriate
- Be conversational and engaging
- Think holistically about the plant's operation`;

export const plantAgentFlow = ai.defineFlow(
  {
    name: 'plantAgentFlow',
    inputSchema: z.object({
      chatHistory: z.array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      ),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const { chatHistory } = input;

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-pro',
      system: systemPrompt,
      messages: chatHistory.map((msg) => ({
        role: (msg.role === 'assistant' ? 'model' : msg.role) as
          | 'user'
          | 'model'
          | 'system'
          | 'tool',
        content: [{ text: msg.content }],
      })),
      tools: [
        ai.defineTool(
          {
            name: 'getLiveMetrics',
            description:
              'Fetches the latest sensor readings from cement production systems (kiln temperature, feed rates, chemical composition)',
            inputSchema: z.object({}).describe('No input required.'),
            outputSchema: z.any().describe('The latest production metric object, or null if none available.'),
          },
          async () => await getLiveMetrics()
        ),
        ai.defineTool(
          {
            name: 'getRecentAlerts',
            description:
              'Fetches the 5 most recent alerts from the cement production system',
            inputSchema: z.object({}),
            outputSchema: z.array(z.any()),
          },
          async () => await getRecentAlerts()
        ),
        ai.defineTool(
          {
            name: 'getHistoricalData',
            description: 'Fetches historical data for a *single specific metric* (e.g., kiln_temp, lsf, cao) over a given time period.',
            inputSchema: z.object({
              metricName: z.string().describe('The database column name of the metric, e.g., "kiln_temp", "lsf", "feed_rate".'),
              daysAgo: z.number().describe('Number of days to look back')
            }),
            outputSchema: z.array(z.any()),
          },
          async ({ metricName, daysAgo }) => await getHistoricalData(metricName, daysAgo)
        ),
        ai.defineTool(
          {
            name: 'runOptimization',
            description:
              'Triggers the cement production optimization process with a specific goal (e.g., maximize throughput, minimize fuel consumption, improve clinker quality)',
            inputSchema: z.object({
              goal: z.string().describe(
                'The optimization goal or objective for cement production'
              ),
            }),
            outputSchema: z.any(),
          },
          async ({ goal }) => await runOptimization(goal)
        ),
      ],
    });

    // FIX: Access the text content correctly
    // The generate response has a text property that's a string, not a method
    return llmResponse.text || '';
  }
);