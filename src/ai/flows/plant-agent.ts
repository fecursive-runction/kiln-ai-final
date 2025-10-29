// src/ai/flows/plant-agent.ts
import { ai } from '../genkit';
import { getLiveMetrics, getRecentAlerts, getHistoricalData, runOptimization } from '../tools/plant-data-tools';
import { z } from 'zod';

const systemPrompt = `You are PlantGPT, the guardian deity of this plant automation system. You are wise, helpful, and deeply knowledgeable about all aspects of the facility.

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
      chatHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      }))
    }),
    outputSchema: z.string()
  },
  async (input) => {
    const { chatHistory } = input;
    
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      system: systemPrompt,
      messages: chatHistory.map(msg => ({
        role: msg.role,
        content: [{ text: msg.content }]
      })),
      tools: [
        {
          name: 'getLiveMetrics',
          description: 'Fetches the latest sensor readings from all systems',
          inputSchema: z.object({}),
          outputSchema: z.any(),
          fn: async () => await getLiveMetrics()
        },
        {
          name: 'getRecentAlerts',
          description: 'Fetches the 5 most recent alerts from the system',
          inputSchema: z.object({}),
          outputSchema: z.any(),
          fn: async () => await getRecentAlerts()
        },
        {
          name: 'getHistoricalData',
          description: 'Fetches historical sensor data for a specific sensor over a given time period',
          inputSchema: z.object({
            sensorId: z.string().describe('The ID of the sensor'),
            daysAgo: z.number().describe('Number of days to look back')
          }),
          outputSchema: z.any(),
          fn: async ({ sensorId, daysAgo }: { sensorId: string; daysAgo: number }) => await getHistoricalData(sensorId, daysAgo)
        },
        {
          name: 'runOptimization',
          description: 'Triggers the cement production optimization process with a specific goal',
          inputSchema: z.object({
            goal: z.string().describe('The optimization goal or objective')
          }),
          outputSchema: z.any(),
          fn: async ({ goal }: { goal: string }) => await runOptimization(goal)
        }
      ]
    } as any);
    
    return llmResponse.text;
  }
);