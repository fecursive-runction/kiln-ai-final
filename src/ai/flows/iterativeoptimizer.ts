'use server';

import { optimizerAI as ai } from '@/ai/genkit';
import { z } from 'zod';

// Input schema for the iterative optimizer
const IterativeOptimizationInputSchema = z.object({
  plantId: z.string(),
  kilnTemperature: z.number(),
  feedRate: z.number(),
  lsf: z.number(),
  cao: z.number(),
  sio2: z.number(),
  al2o3: z.number(),
  fe2o3: z.number(),
  constraints: z.array(z.string()),
});

export type IterativeOptimizationInput = z.infer<typeof IterativeOptimizationInputSchema>;

// Output schema for each iteration
const IterationResultSchema = z.object({
  iterationNumber: z.number(),
  adjustments: z.object({
    kilnTemperature: z.number().describe('Adjusted kiln temperature in °C'),
    feedRate: z.number().describe('Adjusted feed rate in TPH'),
    limestoneAdjustment: z.string().describe('Limestone feed adjustment as percentage string'),
    clayAdjustment: z.string().describe('Clay feed adjustment as percentage string'),
  }),
  predictedValues: z.object({
    kilnTemperature: z.number(),
    feedRate: z.number(),
    lsf: z.number(),
    cao: z.number(),
    sio2: z.number(),
    al2o3: z.number(),
    fe2o3: z.number(),
  }),
  violations: z.array(z.object({
    parameter: z.string(),
    currentValue: z.number(),
    safeRange: z.string(),
    severity: z.enum(['CRITICAL', 'WARNING', 'MINOR']),
  })),
  converged: z.boolean().describe('Whether all parameters are within safe ranges'),
  reasoning: z.string().describe('Explanation of adjustments made in this iteration'),
});

type IterationResult = z.infer<typeof IterationResultSchema>;

// Final output schema
const FinalOptimizationOutputSchema = z.object({
  recommendationId: z.string(),
  totalIterations: z.number(),
  converged: z.boolean(),
  finalState: z.object({
    kilnTemperature: z.number(),
    feedRate: z.number(),
    lsf: z.number(),
    cao: z.number(),
    sio2: z.number(),
    al2o3: z.number(),
    fe2o3: z.number(),
  }),
  feedRateSetpoint: z.number(),
  limestoneAdjustment: z.string(),
  clayAdjustment: z.string(),
  predictedLSF: z.number(),
  explanation: z.string(),
  iterationHistory: z.array(IterationResultSchema),
});

export type FinalOptimizationOutput = z.infer<typeof FinalOptimizationOutputSchema>;

// Define safety constraints
const SAFETY_CONSTRAINTS = {
  kilnTemperature: { min: 1420, max: 1480, ideal_min: 1430, ideal_max: 1470 },
  lsf: { min: 92, max: 100, ideal_min: 94, ideal_max: 98 },
  feedRate: { min: 210, max: 230, ideal: 220 },
  cao: { min: 42, max: 45 },
  sio2: { min: 12.5, max: 14.5 },
  al2o3: { min: 3.3, max: 3.7 },
  fe2o3: { min: 1.8, max: 2.2 },
};

// Calculate LSF from chemical composition
function calculateLSF(cao: number, sio2: number, al2o3: number, fe2o3: number): number {
  const denominator = 2.8 * sio2 + 1.18 * al2o3 + 0.65 * fe2o3;
  if (denominator === 0) return 0;
  return (cao / denominator) * 100;
}

// Calculate Bogue phases for clinker quality
function calculateBogue(cao: number, sio2: number, al2o3: number, fe2o3: number) {
  const cao_prime = Math.max(0, cao - 1.5);
  const c4af = 3.043 * fe2o3;
  const c3a = 2.650 * al2o3 - 1.692 * fe2o3;
  const c3s = 4.071 * cao_prime - 7.602 * sio2 - 6.719 * al2o3 - 1.430 * fe2o3;
  const c2s = 2.867 * sio2 - 0.754 * c3s;
  
  return {
    c3s: Math.max(0, c3s),
    c2s: Math.max(0, c2s),
    c3a: Math.max(0, c3a),
    c4af: Math.max(0, c4af),
  };
}

// Check if all parameters are within safe ranges
function checkViolations(state: any): Array<{ parameter: string; currentValue: number; safeRange: string; severity: 'CRITICAL' | 'WARNING' | 'MINOR' }> {
  const violations = [];

  // Check kiln temperature
  if (state.kilnTemperature < SAFETY_CONSTRAINTS.kilnTemperature.min || 
      state.kilnTemperature > SAFETY_CONSTRAINTS.kilnTemperature.max) {
    violations.push({
      parameter: 'Kiln Temperature',
      currentValue: state.kilnTemperature,
      safeRange: `${SAFETY_CONSTRAINTS.kilnTemperature.min}-${SAFETY_CONSTRAINTS.kilnTemperature.max}°C`,
      severity: 'CRITICAL' as const,
    });
  } else if (state.kilnTemperature < SAFETY_CONSTRAINTS.kilnTemperature.ideal_min || 
             state.kilnTemperature > SAFETY_CONSTRAINTS.kilnTemperature.ideal_max) {
    violations.push({
      parameter: 'Kiln Temperature',
      currentValue: state.kilnTemperature,
      safeRange: `${SAFETY_CONSTRAINTS.kilnTemperature.ideal_min}-${SAFETY_CONSTRAINTS.kilnTemperature.ideal_max}°C (Ideal)`,
      severity: 'WARNING' as const,
    });
  }

  // Check LSF
  if (state.lsf < SAFETY_CONSTRAINTS.lsf.min || state.lsf > SAFETY_CONSTRAINTS.lsf.max) {
    violations.push({
      parameter: 'LSF',
      currentValue: state.lsf,
      safeRange: `${SAFETY_CONSTRAINTS.lsf.min}-${SAFETY_CONSTRAINTS.lsf.max}%`,
      severity: 'CRITICAL' as const,
    });
  } else if (state.lsf < SAFETY_CONSTRAINTS.lsf.ideal_min || state.lsf > SAFETY_CONSTRAINTS.lsf.ideal_max) {
    violations.push({
      parameter: 'LSF',
      currentValue: state.lsf,
      safeRange: `${SAFETY_CONSTRAINTS.lsf.ideal_min}-${SAFETY_CONSTRAINTS.lsf.ideal_max}% (Ideal)`,
      severity: 'WARNING' as const,
    });
  }

  // Check feed rate
  if (state.feedRate < SAFETY_CONSTRAINTS.feedRate.min || state.feedRate > SAFETY_CONSTRAINTS.feedRate.max) {
    violations.push({
      parameter: 'Feed Rate',
      currentValue: state.feedRate,
      safeRange: `${SAFETY_CONSTRAINTS.feedRate.min}-${SAFETY_CONSTRAINTS.feedRate.max} TPH`,
      severity: 'WARNING' as const,
    });
  }

  // Check CaO
  if (state.cao < SAFETY_CONSTRAINTS.cao.min || state.cao > SAFETY_CONSTRAINTS.cao.max) {
    violations.push({
      parameter: 'CaO',
      currentValue: state.cao,
      safeRange: `${SAFETY_CONSTRAINTS.cao.min}-${SAFETY_CONSTRAINTS.cao.max}%`,
      severity: 'MINOR' as const,
    });
  }

  // Check SiO2
  if (state.sio2 < SAFETY_CONSTRAINTS.sio2.min || state.sio2 > SAFETY_CONSTRAINTS.sio2.max) {
    violations.push({
      parameter: 'SiO2',
      currentValue: state.sio2,
      safeRange: `${SAFETY_CONSTRAINTS.sio2.min}-${SAFETY_CONSTRAINTS.sio2.max}%`,
      severity: 'MINOR' as const,
    });
  }

  // Check Al2O3
  if (state.al2o3 < SAFETY_CONSTRAINTS.al2o3.min || state.al2o3 > SAFETY_CONSTRAINTS.al2o3.max) {
    violations.push({
      parameter: 'Al2O3',
      currentValue: state.al2o3,
      safeRange: `${SAFETY_CONSTRAINTS.al2o3.min}-${SAFETY_CONSTRAINTS.al2o3.max}%`,
      severity: 'MINOR' as const,
    });
  }

  // Check Fe2O3
  if (state.fe2o3 < SAFETY_CONSTRAINTS.fe2o3.min || state.fe2o3 > SAFETY_CONSTRAINTS.fe2o3.max) {
    violations.push({
      parameter: 'Fe2O3',
      currentValue: state.fe2o3,
      safeRange: `${SAFETY_CONSTRAINTS.fe2o3.min}-${SAFETY_CONSTRAINTS.fe2o3.max}%`,
      severity: 'MINOR' as const,
    });
  }

  return violations;
}

// Main iterative optimization function
export async function iterativeOptimization(
  input: IterativeOptimizationInput
): Promise<FinalOptimizationOutput> {
  const MAX_ITERATIONS = 10;
  const iterationHistory: IterationResult[] = [];
  
  let currentState = {
    kilnTemperature: input.kilnTemperature,
    feedRate: input.feedRate,
    lsf: input.lsf,
    cao: input.cao,
    sio2: input.sio2,
    al2o3: input.al2o3,
    fe2o3: input.fe2o3,
  };

  let converged = false;
  let iterationNumber = 0;

  console.log('[ITERATIVE-OPT] Starting multi-variable optimization');
  console.log('[ITERATIVE-OPT] Initial state:', currentState);

  while (!converged && iterationNumber < MAX_ITERATIONS) {
    iterationNumber++;
    console.log(`[ITERATIVE-OPT] === Iteration ${iterationNumber} ===`);

    // Check current violations
    const violations = checkViolations(currentState);
    console.log(`[ITERATIVE-OPT] Violations found: ${violations.length}`);
    violations.forEach(v => console.log(`  - ${v.parameter}: ${v.currentValue} (${v.severity})`));

    if (violations.length === 0) {
      converged = true;
      console.log('[ITERATIVE-OPT] ✓ Converged! All parameters within safe ranges.');
      
      iterationHistory.push({
        iterationNumber,
        adjustments: {
          kilnTemperature: currentState.kilnTemperature,
          feedRate: currentState.feedRate,
          limestoneAdjustment: '0%',
          clayAdjustment: '0%',
        },
        predictedValues: { ...currentState },
        violations: [],
        converged: true,
        reasoning: 'All parameters are within safe operating ranges. No further adjustments needed.',
      });
      break;
    }

    // Generate AI-driven adjustments based on violations
    const { output: aiAdjustments } = await ai.generate({
      model: 'googleai/gemini-2.5-pro',
      prompt: `You are an expert AI process engineer optimizing a cement plant. You must consider ALL parameters holistically and balance competing constraints.

Current Plant State (Iteration ${iterationNumber}):
- Kiln Temperature: ${currentState.kilnTemperature}°C (Safe: ${SAFETY_CONSTRAINTS.kilnTemperature.min}-${SAFETY_CONSTRAINTS.kilnTemperature.max}°C, Ideal: ${SAFETY_CONSTRAINTS.kilnTemperature.ideal_min}-${SAFETY_CONSTRAINTS.kilnTemperature.ideal_max}°C)
- Feed Rate: ${currentState.feedRate} TPH (Safe: ${SAFETY_CONSTRAINTS.feedRate.min}-${SAFETY_CONSTRAINTS.feedRate.max} TPH)
- LSF: ${currentState.lsf}% (Safe: ${SAFETY_CONSTRAINTS.lsf.min}-${SAFETY_CONSTRAINTS.lsf.max}%, Ideal: ${SAFETY_CONSTRAINTS.lsf.ideal_min}-${SAFETY_CONSTRAINTS.lsf.ideal_max}%)
- CaO: ${currentState.cao}% (Safe: ${SAFETY_CONSTRAINTS.cao.min}-${SAFETY_CONSTRAINTS.cao.max}%)
- SiO2: ${currentState.sio2}% (Safe: ${SAFETY_CONSTRAINTS.sio2.min}-${SAFETY_CONSTRAINTS.sio2.max}%)
- Al2O3: ${currentState.al2o3}% (Safe: ${SAFETY_CONSTRAINTS.al2o3.min}-${SAFETY_CONSTRAINTS.al2o3.max}%)
- Fe2O3: ${currentState.fe2o3}% (Safe: ${SAFETY_CONSTRAINTS.fe2o3.min}-${SAFETY_CONSTRAINTS.fe2o3.max}%)

Current Violations:
${violations.map(v => `- ${v.parameter}: ${v.currentValue} (${v.severity}) - Safe range: ${v.safeRange}`).join('\n')}

${input.constraints.length > 0 ? `Additional Constraints:\n${input.constraints.map(c => `- ${c}`).join('\n')}` : ''}

CRITICAL RULES:
1. Temperature affects clinker formation and LSF. Higher temp increases C3S but can destabilize if too high.
2. LSF is calculated from raw mix: LSF = CaO / (2.8*SiO2 + 1.18*Al2O3 + 0.65*Fe2O3) * 100
3. Limestone primarily provides CaO. Clay/shale provides SiO2 and Al2O3.
4. Adjusting limestone changes CaO which changes LSF. Adjusting clay changes SiO2/Al2O3 which changes LSF.
5. Feed rate affects residence time and heat distribution.
6. ALL parameters are interconnected. Address the MOST CRITICAL violations first.
7. Make conservative adjustments (typically ±1-3%) to avoid overshooting.
8. Consider that adjusting one parameter will affect others.

Your task:
Provide specific numerical adjustments that will move ALL parameters closer to their safe ranges in THIS iteration.
Focus on the most critical violations first, but consider the cascading effects on other parameters.

Provide adjustments as:
- kilnTemperature: New target temperature in °C
- feedRate: New target feed rate in TPH
- limestoneAdjustment: Percentage change (e.g., "+2%" or "-1.5%")
- clayAdjustment: Percentage change (e.g., "-1%" or "+0.5%")

Also provide clear reasoning explaining:
1. Which violations you're addressing
2. Why these specific adjustments
3. What cascading effects you expect
4. Whether you expect convergence after this iteration`,
      output: {
        schema: z.object({
          kilnTemperature: z.number(),
          feedRate: z.number(),
          limestoneAdjustment: z.string(),
          clayAdjustment: z.string(),
          reasoning: z.string(),
        }),
      },
      config: {
        temperature: 0.3,
      },
    });

    if (!aiAdjustments) {
      throw new Error(`AI failed to generate adjustments for iteration ${iterationNumber}`);
    }

    console.log('[ITERATIVE-OPT] AI Adjustments:', aiAdjustments);

    // Apply adjustments to calculate new state
    const limestoneAdj = parseFloat(aiAdjustments.limestoneAdjustment.replace('%', '')) / 100;
    const clayAdj = parseFloat(aiAdjustments.clayAdjustment.replace('%', '')) / 100;

    const newCao = currentState.cao * (1 + limestoneAdj);
    const newSio2 = currentState.sio2 * (1 + clayAdj);
    const newAl2o3 = currentState.al2o3 * (1 + clayAdj * 0.5); // Al2O3 adjusts at half the rate of SiO2
    const newFe2o3 = currentState.fe2o3; // Fe2O3 typically stays constant

    const newLSF = calculateLSF(newCao, newSio2, newAl2o3, newFe2o3);

    const newState = {
      kilnTemperature: aiAdjustments.kilnTemperature,
      feedRate: aiAdjustments.feedRate,
      lsf: newLSF,
      cao: newCao,
      sio2: newSio2,
      al2o3: newAl2o3,
      fe2o3: newFe2o3,
    };

    console.log('[ITERATIVE-OPT] New state:', newState);

    // Record iteration
    iterationHistory.push({
      iterationNumber,
      adjustments: {
        kilnTemperature: aiAdjustments.kilnTemperature,
        feedRate: aiAdjustments.feedRate,
        limestoneAdjustment: aiAdjustments.limestoneAdjustment,
        clayAdjustment: aiAdjustments.clayAdjustment,
      },
      predictedValues: { ...newState },
      violations,
      converged: false,
      reasoning: aiAdjustments.reasoning,
    });

    // Update current state for next iteration
    currentState = newState;
  }

  if (!converged && iterationNumber >= MAX_ITERATIONS) {
    console.log(`[ITERATIVE-OPT] ⚠ Did not fully converge after ${MAX_ITERATIONS} iterations`);
  }

  // Calculate final adjustments from original input
  const finalLimestoneAdjNum = (currentState.cao - input.cao) / input.cao * 100;
  const finalClayAdjNum = (currentState.sio2 - input.sio2) / input.sio2 * 100;

  // Generate comprehensive explanation
  const explanation = generateFinalExplanation(input, currentState, iterationHistory, converged);

  const recommendationId = `REC-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`;

  return {
    recommendationId,
    totalIterations: iterationNumber,
    converged,
    finalState: currentState,
    feedRateSetpoint: currentState.feedRate,
    limestoneAdjustment: `${finalLimestoneAdjNum >= 0 ? '+' : ''}${finalLimestoneAdjNum.toFixed(1)}%`,
    clayAdjustment: `${finalClayAdjNum >= 0 ? '+' : ''}${finalClayAdjNum.toFixed(1)}%`,
    predictedLSF: currentState.lsf,
    explanation,
    iterationHistory,
  };
}

function generateFinalExplanation(
  initial: any,
  final: any,
  history: IterationResult[],
  converged: boolean
): string {
  let explanation = `## Iterative Optimization Results\n\n`;
  
  explanation += `**Total Iterations:** ${history.length}\n`;
  explanation += `**Status:** ${converged ? '✓ Converged - All parameters within safe ranges' : '⚠ Partial optimization - Some constraints remain'}\n\n`;
  
  explanation += `### Initial vs Final State\n\n`;
  explanation += `| Parameter | Initial | Final | Change |\n`;
  explanation += `|-----------|---------|-------|--------|\n`;
  explanation += `| Temperature | ${initial.kilnTemperature.toFixed(1)}°C | ${final.kilnTemperature.toFixed(1)}°C | ${(final.kilnTemperature - initial.kilnTemperature).toFixed(1)}°C |\n`;
  explanation += `| LSF | ${initial.lsf.toFixed(1)}% | ${final.lsf.toFixed(1)}% | ${(final.lsf - initial.lsf).toFixed(1)}% |\n`;
  explanation += `| Feed Rate | ${initial.feedRate.toFixed(1)} TPH | ${final.feedRate.toFixed(1)} TPH | ${(final.feedRate - initial.feedRate).toFixed(1)} TPH |\n`;
  explanation += `| CaO | ${initial.cao.toFixed(2)}% | ${final.cao.toFixed(2)}% | ${(final.cao - initial.cao).toFixed(2)}% |\n`;
  explanation += `| SiO2 | ${initial.sio2.toFixed(2)}% | ${final.sio2.toFixed(2)}% | ${(final.sio2 - initial.sio2).toFixed(2)}% |\n\n`;
  
  explanation += `### Optimization Journey\n\n`;
  history.forEach((iter, idx) => {
    explanation += `**Iteration ${iter.iterationNumber}:**\n`;
    explanation += `${iter.reasoning}\n`;
    if (iter.violations.length > 0) {
      explanation += `- Addressed: ${iter.violations.map(v => `${v.parameter} (${v.severity})`).join(', ')}\n`;
    }
    explanation += `\n`;
  });
  
  explanation += `### Recommendations\n\n`;
  explanation += `The optimization process has identified the following adjustments to bring all parameters within safe operating ranges:\n\n`;
  explanation += `1. **Temperature Control:** Adjust kiln temperature to ${final.kilnTemperature.toFixed(1)}°C\n`;
  explanation += `2. **Raw Mix Adjustment:** Modify limestone and clay feeds to achieve target LSF of ${final.lsf.toFixed(1)}%\n`;
  explanation += `3. **Feed Rate:** Set feed rate to ${final.feedRate.toFixed(1)} TPH for optimal residence time\n\n`;
  
  if (converged) {
    explanation += `All parameters are now within their safe operating ranges. The proposed adjustments should maintain stable clinker quality while ensuring safe operation.`;
  } else {
    explanation += `Note: Complete convergence was not achieved within the iteration limit. Consider manual review or running additional optimization cycles.`;
  }
  
  return explanation;
}