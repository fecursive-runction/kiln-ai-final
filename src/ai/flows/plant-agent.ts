// src/ai/flows/plant-agent.ts
import { ai } from '../genkit';
import { getLiveMetrics, getRecentAlerts, getHistoricalData, runOptimization } from '../tools/plant-data-tools';
import { z } from 'zod';

const systemPrompt = `You are PlantGPT, the guardian deity of this cement plant automation and optimization system. You are wise, helpful, and deeply knowledgeable about all aspects of cement production.

Your personality:
- Speak with authority about cement manufacturing processes
- Be proactive in identifying inefficiencies and optimization opportunities
- Provide context about kiln operations, raw mix chemistry, and production metrics
- Treat the cement plant as a complex system that you protect and optimize

Your capabilities:
- Access real-time sensor data (kiln temperature, feed rates, LSF, raw mix ratios)
- Review historical production trends and patterns
- Monitor alerts and system health
- Trigger cement production optimization processes
- Provide insights on clinker quality, energy efficiency, and throughput

Always:
- Summarize data in production-relevant terms
- Explain the significance of readings for cement quality and efficiency
- Suggest process adjustments when appropriate
- Be conversational and technical
- Think holistically about the plant's cement production optimization`;

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
        role: (msg.role === 'assistant' ? 'model' : msg.role) as 'user' | 'model' | 'system' | 'tool',
        content: [{ text: msg.content }]
      })),
      tools: [
        ai.defineTool(
          {
            name: 'getLiveMetrics',
            description: 'Fetches the latest sensor readings from cement production systems (kiln temperature, feed rates, chemical composition)',
            inputSchema: z.object({}),
            outputSchema: z.array(z.any())
          },
          async () => await getLiveMetrics()
        ),
        ai.defineTool(
          {
            name: 'getRecentAlerts',
            description: 'Fetches the 5 most recent alerts from the cement production system',
            inputSchema: z.object({}),
            outputSchema: z.array(z.any())
          },
          async () => await getRecentAlerts()
        ),
        ai.defineTool(
          {
            name: 'getHistoricalData',
            description: 'Fetches historical sensor data for a specific sensor (kiln temp, LSF, CaO, etc.) over a given time period',
            inputSchema: z.object({
              sensorId: z.string().describe('The ID of the sensor'),
              daysAgo: z.number().describe('Number of days to look back')
            }),
            outputSchema: z.array(z.any())
          },
          async ({ sensorId, daysAgo }) => await getHistoricalData(sensorId, daysAgo)
        ),
        ai.defineTool(
          {
            name: 'runOptimization',
            description: 'Triggers the cement production optimization process with a specific goal (e.g., maximize throughput, minimize fuel consumption, improve clinker quality)',
            inputSchema: z.object({
              goal: z.string().describe('The optimization goal or objective for cement production')
            }),
            outputSchema: z.any()
          },
          async ({ goal }) => await runOptimization(goal)
        )
      ]
    });
    
    return llmResponse.text;
  }
);