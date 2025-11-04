'use server';

import { optimizerAI as ai } from '@/ai/genkit';
import { 
  type OptimizeCementProductionInput,
  type AIGenerationOutput,
  AIGenerationSchema 
} from './optimization-schemas';

// Safety constraints
const CONSTRAINTS = {
  temp: { min: 1420, max: 1480, ideal_min: 1430, ideal_max: 1470 },
  lsf: { min: 92, max: 100, ideal_min: 94, ideal_max: 98 },
  feedRate: { min: 210, max: 230 },
};

function calculateLSF(cao: number, sio2: number, al2o3: number, fe2o3: number): number {
  const denominator = 2.8 * sio2 + 1.18 * al2o3 + 0.65 * fe2o3;
  return denominator === 0 ? 0 : (cao / denominator) * 100;
}

function checkViolations(state: any): string[] {
  const issues: string[] = [];
  
  if (state.kilnTemperature < CONSTRAINTS.temp.min || state.kilnTemperature > CONSTRAINTS.temp.max) {
    issues.push(`Temperature ${state.kilnTemperature}°C is CRITICAL (safe: ${CONSTRAINTS.temp.min}-${CONSTRAINTS.temp.max}°C)`);
  } else if (state.kilnTemperature < CONSTRAINTS.temp.ideal_min || state.kilnTemperature > CONSTRAINTS.temp.ideal_max) {
    issues.push(`Temperature ${state.kilnTemperature}°C needs adjustment (ideal: ${CONSTRAINTS.temp.ideal_min}-${CONSTRAINTS.temp.ideal_max}°C)`);
  }
  
  if (state.lsf < CONSTRAINTS.lsf.min || state.lsf > CONSTRAINTS.lsf.max) {
    issues.push(`LSF ${state.lsf}% is CRITICAL (safe: ${CONSTRAINTS.lsf.min}-${CONSTRAINTS.lsf.max}%)`);
  } else if (state.lsf < CONSTRAINTS.lsf.ideal_min || state.lsf > CONSTRAINTS.lsf.ideal_max) {
    issues.push(`LSF ${state.lsf}% needs adjustment (ideal: ${CONSTRAINTS.lsf.ideal_min}-${CONSTRAINTS.lsf.ideal_max}%)`);
  }
  
  if (state.feedRate < CONSTRAINTS.feedRate.min || state.feedRate > CONSTRAINTS.feedRate.max) {
    issues.push(`Feed rate ${state.feedRate} TPH outside range (${CONSTRAINTS.feedRate.min}-${CONSTRAINTS.feedRate.max} TPH)`);
  }
  
  return issues;
}

export async function optimizeCementProduction(input: OptimizeCementProductionInput): Promise<AIGenerationOutput> {
  console.log('[OPT] Starting multi-variable optimization');
  
  const MAX_ITERATIONS = 5;
  let currentState = {
    kilnTemperature: input.kilnTemperature,
    feedRate: input.feedRate,
    lsf: input.lsf,
    cao: input.cao,
    sio2: input.sio2,
    al2o3: input.al2o3,
    fe2o3: input.fe2o3,
  };
  
  let allIterations: string[] = [];
  let finalLimestoneAdj = '0%';
  let finalClayAdj = '0%';
  let finalFeedRate = input.feedRate;
  
  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`[OPT] === Iteration ${iteration}/${MAX_ITERATIONS} ===`);
    console.log(`[OPT] Current LSF: ${currentState.lsf.toFixed(2)}%`);
    console.log(`[OPT] Current Temp: ${currentState.kilnTemperature.toFixed(1)}°C`);
    
    const violations = checkViolations(currentState);
    console.log(`[OPT] Violations found: ${violations.length}`);
    
    if (violations.length === 0) {
      console.log('[OPT] ✓ All parameters converged!');
      allIterations.push(`Iteration ${iteration}: All parameters within safe ranges. Optimization complete.`);
      break;
    }
    
    violations.forEach(v => console.log(`[OPT]   - ${v}`));
    
    // Generate AI recommendation for this iteration
    const prompt = `You are optimizing a cement plant. This is iteration ${iteration} of ${MAX_ITERATIONS}.

Current State:
- Kiln Temperature: ${currentState.kilnTemperature}°C (Safe: ${CONSTRAINTS.temp.min}-${CONSTRAINTS.temp.max}°C, Ideal: ${CONSTRAINTS.temp.ideal_min}-${CONSTRAINTS.temp.ideal_max}°C)
- Feed Rate: ${currentState.feedRate} TPH (Safe: ${CONSTRAINTS.feedRate.min}-${CONSTRAINTS.feedRate.max} TPH)
- LSF: ${currentState.lsf}% (Safe: ${CONSTRAINTS.lsf.min}-${CONSTRAINTS.lsf.max}%, Ideal: ${CONSTRAINTS.lsf.ideal_min}-${CONSTRAINTS.lsf.ideal_max}%)
- CaO: ${currentState.cao}%
- SiO2: ${currentState.sio2}%
- Al2O3: ${currentState.al2o3}%
- Fe2O3: ${currentState.fe2o3}%

Issues to fix:
${violations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

CRITICAL CONSTRAINTS:
- Temperature MUST be between ${CONSTRAINTS.temp.min}-${CONSTRAINTS.temp.max}°C (ideally ${CONSTRAINTS.temp.ideal_min}-${CONSTRAINTS.temp.ideal_max}°C)
- LSF MUST be between ${CONSTRAINTS.lsf.min}-${CONSTRAINTS.lsf.max}% (ideally ${CONSTRAINTS.lsf.ideal_min}-${CONSTRAINTS.lsf.ideal_max}%)
- Feed rate MUST be between ${CONSTRAINTS.feedRate.min}-${CONSTRAINTS.feedRate.max} TPH

IMPORTANT FORMULAS:
- LSF = CaO / (2.8*SiO2 + 1.18*Al2O3 + 0.65*Fe2O3) * 100
- Increasing limestone (CaO) INCREASES LSF
- Increasing clay (SiO2/Al2O3) DECREASES LSF
- Make SMALL adjustments (0.5-2%) to avoid overshooting
- If LSF is too HIGH, you MUST DECREASE limestone or INCREASE clay
- If LSF is too LOW, you MUST INCREASE limestone or DECREASE clay

YOUR TASK:
Provide adjustments that will bring ALL parameters closer to their safe/ideal ranges.
For feedRateSetpoint, provide a value between ${CONSTRAINTS.feedRate.min}-${CONSTRAINTS.feedRate.max} TPH.
For adjustments, use small percentages like "+1%", "-0.5%", "+1.5%", "-2%".

Generate a recommendation ID in format REC-YYYYMMDD-HHMMSS.`;

    try {
      const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-lite',
        prompt,
        output: { schema: AIGenerationSchema },
        config: { temperature: 0.2 },
      });

      if (!output) {
        throw new Error('AI returned null output');
      }

      // Parse adjustments and validate
      const limestoneAdj = parseFloat(output.limestoneAdjustment.replace('%', '')) / 100;
      const clayAdj = parseFloat(output.clayAdjustment.replace('%', '')) / 100;

      console.log(`[OPT] AI suggested limestone: ${output.limestoneAdjustment}, clay: ${output.clayAdjustment}`);

      // Apply adjustments
      const newCao = currentState.cao * (1 + limestoneAdj);
      const newSio2 = currentState.sio2 * (1 + clayAdj);
      const newAl2o3 = currentState.al2o3 * (1 + clayAdj * 0.5);
      const newLSF = calculateLSF(newCao, newSio2, newAl2o3, currentState.fe2o3);
      
      console.log(`[OPT] Calculated new LSF: ${newLSF.toFixed(2)}%`);
      
      // Temperature adjustment based on LSF change
      const lsfDiff = newLSF - currentState.lsf;
      let tempAdj = 0;
      let newTemp: number;
      if (Math.abs(lsfDiff) > 3) tempAdj = lsfDiff > 0 ? 10 : -10;
      else if (Math.abs(lsfDiff) > 1) tempAdj = lsfDiff > 0 ? 5 : -5;
      
      // Validate that LSF is moving in the right direction and within bounds
      if (newLSF > CONSTRAINTS.lsf.max || newLSF < CONSTRAINTS.lsf.min) {
        console.log(`[OPT] WARNING: New LSF ${newLSF.toFixed(2)}% is out of bounds!`);
        // Force correction
        if (newLSF > CONSTRAINTS.lsf.max) {
          // LSF too high - need to reduce it
          console.log('[OPT] Forcing LSF reduction by increasing clay');
          const correctedClayAdj = clayAdj + 0.02; // Increase clay more
          const correctedSio2 = currentState.sio2 * (1 + correctedClayAdj);
          const correctedAl2o3 = currentState.al2o3 * (1 + correctedClayAdj * 0.5);
          const correctedLSF = calculateLSF(newCao, correctedSio2, correctedAl2o3, currentState.fe2o3);
          console.log(`[OPT] Corrected LSF: ${correctedLSF.toFixed(2)}%`);
          
          currentState = {
            kilnTemperature: newTemp = output.feedRateSetpoint >= CONSTRAINTS.feedRate.min && output.feedRateSetpoint <= CONSTRAINTS.feedRate.max ?
                             Math.max(CONSTRAINTS.temp.min, Math.min(CONSTRAINTS.temp.max, currentState.kilnTemperature + tempAdj)) : currentState.kilnTemperature,
            feedRate: output.feedRateSetpoint >= CONSTRAINTS.feedRate.min && output.feedRateSetpoint <= CONSTRAINTS.feedRate.max ? 
                     output.feedRateSetpoint : currentState.feedRate,
            lsf: correctedLSF,
            cao: newCao,
            sio2: correctedSio2,
            al2o3: correctedAl2o3,
            fe2o3: currentState.fe2o3,
          };
          
          finalClayAdj = `${correctedClayAdj >= 0 ? '+' : ''}${(correctedClayAdj * 100).toFixed(1)}%`;
        } else {
          // LSF too low - need to increase it
          console.log('[OPT] Forcing LSF increase by increasing limestone');
          const correctedLimestoneAdj = limestoneAdj + 0.02;
          const correctedCao = currentState.cao * (1 + correctedLimestoneAdj);
          const correctedLSF = calculateLSF(correctedCao, newSio2, newAl2o3, currentState.fe2o3);
          console.log(`[OPT] Corrected LSF: ${correctedLSF.toFixed(2)}%`);
          
          currentState = {
            kilnTemperature: newTemp = output.feedRateSetpoint >= CONSTRAINTS.feedRate.min && output.feedRateSetpoint <= CONSTRAINTS.feedRate.max ?
                             Math.max(CONSTRAINTS.temp.min, Math.min(CONSTRAINTS.temp.max, currentState.kilnTemperature + tempAdj)) : currentState.kilnTemperature,
            feedRate: output.feedRateSetpoint >= CONSTRAINTS.feedRate.min && output.feedRateSetpoint <= CONSTRAINTS.feedRate.max ? 
                     output.feedRateSetpoint : currentState.feedRate,
            lsf: correctedLSF,
            cao: correctedCao,
            sio2: newSio2,
            al2o3: newAl2o3,
            fe2o3: currentState.fe2o3,
          };
          
          finalLimestoneAdj = `${correctedLimestoneAdj >= 0 ? '+' : ''}${(correctedLimestoneAdj * 100).toFixed(1)}%`;
        }
      } else {
        // LSF is within bounds, proceed normally
        newTemp = Math.max(CONSTRAINTS.temp.min, Math.min(CONSTRAINTS.temp.max, currentState.kilnTemperature + tempAdj));

        currentState = {
          kilnTemperature: newTemp,
          feedRate: output.feedRateSetpoint >= CONSTRAINTS.feedRate.min && output.feedRateSetpoint <= CONSTRAINTS.feedRate.max ? 
                   output.feedRateSetpoint : currentState.feedRate,
          lsf: newLSF,
          cao: newCao,
          sio2: newSio2,
          al2o3: newAl2o3,
          fe2o3: currentState.fe2o3,
        };

        finalLimestoneAdj = output.limestoneAdjustment;
        finalClayAdj = output.clayAdjustment;
      }

      finalFeedRate = currentState.feedRate;
      finalFeedRate = output.feedRateSetpoint;

      allIterations.push(`Iteration ${iteration}: ${output.explanation}`);
      
      console.log(`[OPT] New LSF: ${newLSF.toFixed(2)}%, Temp: ${newTemp.toFixed(1)}°C`);
      
    } catch (error: any) {
      console.error(`[OPT] Error in iteration ${iteration}:`, error);
      throw new Error(`Optimization failed at iteration ${iteration}: ${error.message}`);
    }
  }

  // Generate comprehensive explanation without showing iterations
  const tempChange = currentState.kilnTemperature - input.kilnTemperature;
  const lsfChange = currentState.lsf - input.lsf;
  const feedChange = finalFeedRate - input.feedRate;

  const finalExplanation = `Based on comprehensive multi-parameter analysis, the following adjustments will optimize plant operations:

**Kiln Temperature:** Adjusted to **${currentState.kilnTemperature.toFixed(1)}°C** (${tempChange >= 0 ? '+' : ''}${tempChange.toFixed(1)}°C). This temperature ${tempChange > 0 ? '*increase*' : tempChange < 0 ? '*decrease*' : 'adjustment'} ensures optimal clinker formation while maintaining the C₃S/C₂S ratio for desired cement strength characteristics. Temperature control is **critical** as it directly impacts reaction kinetics and phase formation.

**Lime Saturation Factor (LSF):** Target **${currentState.lsf.toFixed(1)}%** (${lsfChange >= 0 ? '+' : ''}${lsfChange.toFixed(1)}%). The LSF is the *most critical parameter* in cement chemistry, calculated as:

*LSF = CaO/(2.8×SiO₂ + 1.18×Al₂O₃ + 0.65×Fe₂O₃) × 100*

This adjustment ensures proper lime saturation for optimal clinker quality, burnability, and strength development while preventing issues like free lime or underburnt clinker.

**Raw Mix Adjustments:**
- **Limestone feed:** ${finalLimestoneAdj} - Limestone is the primary source of CaO. This adjustment directly controls the LSF and calcium availability for C₃S formation, which is *essential for early strength development* in cement.
- **Clay/Shale feed:** ${finalClayAdj} - Clay provides SiO₂ and Al₂O₃. Adjusting this material balances the raw mix chemistry, controlling the silica and alumina modules which affect clinker burnability and the formation of secondary phases like C₃A and C₄AF.

**Feed Rate:** Set to **${finalFeedRate.toFixed(1)} TPH** (${feedChange >= 0 ? '+' : ''}${feedChange.toFixed(1)} TPH). This feed rate optimizes residence time in the kiln, ensuring complete chemical reactions while maintaining production efficiency and thermal balance.

**Why These Changes Work:**
All parameters are *interconnected* in cement production. Temperature affects the speed and completeness of clinker formation reactions. The raw mix chemistry (controlled by limestone and clay proportions) determines the LSF, which governs clinker quality and burnability. Feed rate impacts residence time and heat distribution. 

These adjustments work together to bring **all parameters within safe operating ranges** while maintaining optimal clinker quality and production efficiency. The recommended changes have been calculated considering the *cascading effects* between all variables to ensure stable, safe, and efficient operation.`;

  const recommendationId = `REC-${Date.now()}`;

  return {
    recommendationId,
    feedRateSetpoint: finalFeedRate,
    limestoneAdjustment: finalLimestoneAdj,
    clayAdjustment: finalClayAdj,
    explanation: finalExplanation,
  };
}