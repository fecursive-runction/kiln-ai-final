// src/app/api/ingest/route.ts - Ultra-refined version with direct LSF control
'use server';

import { NextResponse } from 'next/server';
import { getLatestMetric, insertMetric, ProductionMetric } from '@/lib/data/metrics';

const calculateBogue = (cao: number, sio2: number, al2o3: number, fe2o3: number) => {
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
};

const calculateLSF = (cao: number, sio2: number, al2o3: number, fe2o3: number) => {
  const denominator = 2.8 * sio2 + 1.18 * al2o3 + 0.65 * fe2o3;
  if (denominator === 0) return 0;
  return (cao / denominator) * 100;
};

/**
 * Back-calculate CaO from target LSF while keeping other oxides constant
 * This ensures LSF converges smoothly without oscillation
 */
const calculateCaoFromLSF = (targetLSF: number, sio2: number, al2o3: number, fe2o3: number): number => {
  const denominator = 2.8 * sio2 + 1.18 * al2o3 + 0.65 * fe2o3;
  return (targetLSF / 100) * denominator;
};

const KILN_TEMP_CRITICAL_HIGH = 1490;
const KILN_TEMP_CRITICAL_LOW = 1410;
const LSF_CRITICAL_HIGH = 100;
const LSF_CRITICAL_LOW = 92;

// ═══════════════════════════════════════════════════════════
// OPTIMIZATION TARGET - COMPLETE control over data generation
// ═══════════════════════════════════════════════════════════
let optimizationTarget: {
  active: boolean;
  targetLSF: number;
  targetFeedRate: number;
  targetKilnTemp: number;
  ticksRemaining: number;
  totalTicks: number;
  startingLSF: number;
  startingCaO: number;
  startingSiO2: number;
  startingAl2O3: number;
  startingFe2O3: number;
  startingFeedRate: number;
  startingKilnTemp: number;
  targetCaO: number;
  targetSiO2: number;
  targetAl2O3: number;
  limestoneAdj: number;
  clayAdj: number;
} = {
  active: false,
  targetLSF: 96,
  targetFeedRate: 220,
  targetKilnTemp: 1450,
  ticksRemaining: 0,
  totalTicks: 40,
  startingLSF: 96,
  startingCaO: 43.5,
  startingSiO2: 13.5,
  startingAl2O3: 3.5,
  startingFe2O3: 2.0,
  startingFeedRate: 220,
  startingKilnTemp: 1450,
  targetCaO: 43.5,
  targetSiO2: 13.5,
  targetAl2O3: 3.5,
  limestoneAdj: 0,
  clayAdj: 0,
};

// Scenario state - COMPLETELY DISABLED during optimization
let scenario: {
  active: boolean;
  targetMetric: 'kiln_temp' | 'lsf';
  targetValue: number;
  ticksRemaining: number;
  bias: number;
} = {
  active: false,
  targetMetric: 'kiln_temp',
  targetValue: 1450,
  ticksRemaining: 0,
  bias: 0.5,
};

/**
 * Activate optimization with direct LSF control for smooth convergence
 */
export async function activateOptimizationTarget(
  predictedLSF: number,
  feedRateSetpoint: number,
  limestoneAdj: number,
  clayAdj: number
) {
  const currentMetric = await getLatestMetric();
  if (!currentMetric) {
    console.error('[OPT] No current metric available');
    return;
  }

  // Calculate target composition based on adjustments
  const targetCaO = currentMetric.cao * (1 + limestoneAdj);
  const targetSiO2 = currentMetric.sio2 * (1 + clayAdj);
  const targetAl2O3 = currentMetric.al2o3 * (1 + clayAdj * 0.5);
  
  // Calculate target kiln temp based on LSF change magnitude
  const lsfDiff = predictedLSF - currentMetric.lsf;
  let tempAdjustment = 0;
  
  // More aggressive temperature changes for larger LSF differences
  if (Math.abs(lsfDiff) > 5) {
    tempAdjustment = lsfDiff > 0 ? 20 : -20;
  } else if (Math.abs(lsfDiff) > 3) {
    tempAdjustment = lsfDiff > 0 ? 12 : -12;
  } else if (Math.abs(lsfDiff) > 1) {
    tempAdjustment = lsfDiff > 0 ? 6 : -6;
  } else {
    tempAdjustment = lsfDiff > 0 ? 3 : -3;
  }
  
  const targetKilnTemp = Math.max(1420, Math.min(1470, currentMetric.kiln_temp + tempAdjustment));

  optimizationTarget = {
    active: true,
    targetLSF: predictedLSF,
    targetFeedRate: feedRateSetpoint,
    targetKilnTemp: targetKilnTemp,
    ticksRemaining: 40,
    totalTicks: 40,
    startingLSF: currentMetric.lsf,
    startingCaO: currentMetric.cao,
    startingSiO2: currentMetric.sio2,
    startingAl2O3: currentMetric.al2o3,
    startingFe2O3: currentMetric.fe2o3,
    startingFeedRate: currentMetric.feed_rate,
    startingKilnTemp: currentMetric.kiln_temp,
    targetCaO: targetCaO,
    targetSiO2: targetSiO2,
    targetAl2O3: targetAl2O3,
    limestoneAdj: limestoneAdj,
    clayAdj: clayAdj,
  };

  // FORCE DISABLE all normal data generation
  scenario.active = false;
  scenario.ticksRemaining = 0;

  console.log('[OPT] ═══════════════════════════════════════════════════════');
  console.log('[OPT] 🎯 OPTIMIZATION MODE ACTIVATED - DIRECT LSF CONTROL');
  console.log('[OPT] ═══════════════════════════════════════════════════════');
  console.log('[OPT] Starting State:');
  console.log('[OPT]   LSF:  ', currentMetric.lsf.toFixed(2), '% →', predictedLSF.toFixed(2), '% (Δ', (predictedLSF - currentMetric.lsf).toFixed(2), '%)');
  console.log('[OPT]   CaO:  ', currentMetric.cao.toFixed(2), '% →', targetCaO.toFixed(2), '% (', (limestoneAdj * 100).toFixed(1), '%)');
  console.log('[OPT]   SiO2: ', currentMetric.sio2.toFixed(2), '% →', targetSiO2.toFixed(2), '% (', (clayAdj * 100).toFixed(1), '%)');
  console.log('[OPT]   Al2O3:', currentMetric.al2o3.toFixed(2), '% →', targetAl2O3.toFixed(2), '% (', (clayAdj * 50).toFixed(1), '%)');
  console.log('[OPT]   Temp: ', currentMetric.kiln_temp.toFixed(1), '°C →', targetKilnTemp.toFixed(1), '°C');
  console.log('[OPT]   Feed: ', currentMetric.feed_rate.toFixed(1), 'TPH →', feedRateSetpoint.toFixed(1), 'TPH');
  console.log('[OPT] ───────────────────────────────────────────────────────');
  console.log('[OPT] Duration: 40 ticks (~3.3 minutes at 5s intervals)');
  console.log('[OPT] Method: Direct LSF interpolation with back-calculated CaO');
  console.log('[OPT] All normal trends SUSPENDED until target achieved');
  console.log('[OPT] ═══════════════════════════════════════════════════════');
}

/**
 * Smooth easing function - starts slow, speeds up, then slows down at end
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export async function POST() {
  try {
    const previousMetric = await getLatestMetric();
    let lastMetric: ProductionMetric;

    if (!previousMetric) {
      lastMetric = {
        timestamp: new Date().toISOString(),
        plant_id: 'poc_plant_01',
        kiln_temp: 1450,
        feed_rate: 220,
        lsf: 96,
        cao: 43.5,
        sio2: 13.5,
        al2o3: 3.5,
        fe2o3: 2.0,
        c3s: 55,
        c2s: 20,
        c3a: 8,
        c4af: 9,
      };
    } else {
      lastMetric = previousMetric;
    }

    let newKilnTemp: number;
    let newFeedRate: number;
    let newLsf: number;
    let newCao: number;
    let newSio2: number;
    let newAl2o3: number;
    let newFe2o3: number;

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 1: OPTIMIZATION MODE - ABSOLUTE CONTROL, ZERO INTERFERENCE
    // ═══════════════════════════════════════════════════════════════════
    if (optimizationTarget.active && optimizationTarget.ticksRemaining > 0) {
      const tickNumber = optimizationTarget.totalTicks - optimizationTarget.ticksRemaining + 1;
      const progress = tickNumber / optimizationTarget.totalTicks; // 0.0 to 1.0
      
      // Smooth easing for natural deceleration
      const easeProgress = easeInOutCubic(progress);

      // ────────────────────────────────────────────────────────────
      // METHOD 1: Direct LSF Interpolation (prevents oscillation)
      // ────────────────────────────────────────────────────────────
      newLsf = optimizationTarget.startingLSF + 
               (optimizationTarget.targetLSF - optimizationTarget.startingLSF) * easeProgress;
      
      // ────────────────────────────────────────────────────────────
      // Interpolate SiO2, Al2O3, Fe2O3 (these determine denominator)
      // ────────────────────────────────────────────────────────────
      newSio2 = optimizationTarget.startingSiO2 + 
                (optimizationTarget.targetSiO2 - optimizationTarget.startingSiO2) * easeProgress;

      newAl2o3 = optimizationTarget.startingAl2O3 + 
                 (optimizationTarget.targetAl2O3 - optimizationTarget.startingAl2O3) * easeProgress;

      // Fe2O3 typically doesn't change much, small interpolation
      newFe2o3 = optimizationTarget.startingFe2O3 + 
                 (optimizationTarget.startingFe2O3 * 0.001) * (Math.random() - 0.5);

      // ────────────────────────────────────────────────────────────
      // Back-calculate CaO from target LSF (guarantees LSF accuracy)
      // ────────────────────────────────────────────────────────────
      newCao = calculateCaoFromLSF(newLsf, newSio2, newAl2o3, newFe2o3);

      // ────────────────────────────────────────────────────────────
      // Interpolate temperature and feed rate
      // ────────────────────────────────────────────────────────────
      newKilnTemp = optimizationTarget.startingKilnTemp + 
                    (optimizationTarget.targetKilnTemp - optimizationTarget.startingKilnTemp) * easeProgress;

      newFeedRate = optimizationTarget.startingFeedRate + 
                    (optimizationTarget.targetFeedRate - optimizationTarget.startingFeedRate) * easeProgress;

      // ────────────────────────────────────────────────────────────
      // Calculate distances for monitoring
      // ────────────────────────────────────────────────────────────
      const lsfDistance = Math.abs(newLsf - optimizationTarget.targetLSF);
      const caoDistance = Math.abs(newCao - optimizationTarget.targetCaO);
      const sio2Distance = Math.abs(newSio2 - optimizationTarget.targetSiO2);
      const tempDistance = Math.abs(newKilnTemp - optimizationTarget.targetKilnTemp);
      
      // ────────────────────────────────────────────────────────────
      // Logging (every 5 ticks for readability)
      // ────────────────────────────────────────────────────────────
      if (tickNumber % 5 === 0 || tickNumber === 1 || tickNumber === optimizationTarget.totalTicks) {
        console.log(`[OPT] ─────────── Tick ${tickNumber}/${optimizationTarget.totalTicks} (${(progress * 100).toFixed(0)}%) ───────────`);
        console.log(`[OPT] LSF:   ${newLsf.toFixed(2)}% (Target: ${optimizationTarget.targetLSF.toFixed(2)}%, Δ${lsfDistance.toFixed(2)}%)`);
        console.log(`[OPT] CaO:   ${newCao.toFixed(2)}% (Target: ${optimizationTarget.targetCaO.toFixed(2)}%, Δ${caoDistance.toFixed(2)}%)`);
        console.log(`[OPT] SiO2:  ${newSio2.toFixed(2)}% (Target: ${optimizationTarget.targetSiO2.toFixed(2)}%, Δ${sio2Distance.toFixed(2)}%)`);
        console.log(`[OPT] Al2O3: ${newAl2o3.toFixed(2)}% (Target: ${optimizationTarget.targetAl2O3.toFixed(2)}%)`);
        console.log(`[OPT] Temp:  ${newKilnTemp.toFixed(1)}°C (Target: ${optimizationTarget.targetKilnTemp.toFixed(1)}°C, Δ${tempDistance.toFixed(1)}°C)`);
      }

      optimizationTarget.ticksRemaining--;

      // ────────────────────────────────────────────────────────────
      // Check completion with tight tolerances
      // ────────────────────────────────────────────────────────────
      const isLSFAchieved = lsfDistance < 0.2;
      const isCaoAchieved = caoDistance < 0.1;
      const isSio2Achieved = sio2Distance < 0.05;
      const isTempAchieved = tempDistance < 1.5;
      
      const allTargetsAchieved = isLSFAchieved && isCaoAchieved && isSio2Achieved && isTempAchieved;
      
      if (optimizationTarget.ticksRemaining === 0 || allTargetsAchieved) {
        console.log('[OPT] ═══════════════════════════════════════════════════════');
        console.log('[OPT] ✅ OPTIMIZATION COMPLETE');
        console.log('[OPT] ═══════════════════════════════════════════════════════');
        console.log(`[OPT] Final Results (completed in ${tickNumber} ticks):`);
        console.log(`[OPT]   LSF:   ${newLsf.toFixed(2)}% (Target: ${optimizationTarget.targetLSF.toFixed(2)}%, Δ${lsfDistance.toFixed(2)}%)`);
        console.log(`[OPT]   CaO:   ${newCao.toFixed(2)}% (Target: ${optimizationTarget.targetCaO.toFixed(2)}%, Δ${caoDistance.toFixed(2)}%)`);
        console.log(`[OPT]   SiO2:  ${newSio2.toFixed(2)}% (Target: ${optimizationTarget.targetSiO2.toFixed(2)}%, Δ${sio2Distance.toFixed(2)}%)`);
        console.log(`[OPT]   Al2O3: ${newAl2o3.toFixed(2)}% (Target: ${optimizationTarget.targetAl2O3.toFixed(2)}%)`);
        console.log(`[OPT]   Temp:  ${newKilnTemp.toFixed(1)}°C (Target: ${optimizationTarget.targetKilnTemp.toFixed(1)}°C, Δ${tempDistance.toFixed(1)}°C)`);
        console.log(`[OPT]   Feed:  ${newFeedRate.toFixed(1)} TPH (Target: ${optimizationTarget.targetFeedRate.toFixed(1)} TPH)`);
        console.log('[OPT] ───────────────────────────────────────────────────────');
        console.log('[OPT] Status: Target achieved ✓');
        console.log('[OPT] 🔄 Resuming normal data generation patterns');
        console.log('[OPT] ═══════════════════════════════════════════════════════');
        optimizationTarget.active = false;
      }

    } 
    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 2: NORMAL MODE - Only runs when optimization is INACTIVE
    // ═══════════════════════════════════════════════════════════════════
    else {
      // Scenario Management
      if (scenario.active && scenario.ticksRemaining > 0) {
        scenario.ticksRemaining--;
        if (scenario.ticksRemaining === 0) {
          console.log('[NORMAL] Scenario ended, resuming stable trends');
          scenario.active = false;
        }
      } else if (!scenario.active && Math.random() < 0.02) {
        scenario.active = true;
        scenario.ticksRemaining = Math.floor(Math.random() * 11) + 20;
        const targetHigh = Math.random() > 0.5;
        const targetMetric = Math.random() > 0.5 ? 'kiln_temp' : 'lsf';
        scenario.targetMetric = targetMetric;
        if (targetMetric === 'kiln_temp') {
          scenario.targetValue = targetHigh ? KILN_TEMP_CRITICAL_HIGH + 5 : KILN_TEMP_CRITICAL_LOW - 5;
          scenario.bias = targetHigh ? 0.4 : 0.6;
        } else {
          scenario.targetValue = targetHigh ? LSF_CRITICAL_HIGH + 1.5 : LSF_CRITICAL_LOW - 1.5;
          scenario.bias = targetHigh ? 0.4 : 0.6;
        }
        console.log(`[NORMAL] ⚠️ Scenario triggered: ${targetMetric} → ${scenario.targetValue.toFixed(1)}`);
      }

      // LSF bias
      const isLsfScenario = scenario.active && scenario.targetMetric === 'lsf';
      let lsf_bias = isLsfScenario ? scenario.bias : 0.5;

      if (!isLsfScenario) {
        if (lastMetric.lsf > LSF_CRITICAL_HIGH) {
          lsf_bias = 0.7;
        } else if (lastMetric.lsf < LSF_CRITICAL_LOW) {
          lsf_bias = 0.3;
        }
      }

      const lsf_step = 0.15;
      let tempLsf = lastMetric.lsf + (Math.random() - lsf_bias) * lsf_step;
      
      // Kiln temperature
      let kiln_temp_bias = (scenario.active && scenario.targetMetric === 'kiln_temp') ? scenario.bias : 0.5;
      if (!scenario.active || scenario.targetMetric !== 'kiln_temp') {
        if (lastMetric.kiln_temp > KILN_TEMP_CRITICAL_HIGH) {
          kiln_temp_bias = 0.6;
        } else if (lastMetric.kiln_temp < KILN_TEMP_CRITICAL_LOW) {
          kiln_temp_bias = 0.4;
        }
      }

      const kiln_temp_step = 1.5;
      newKilnTemp = lastMetric.kiln_temp + (Math.random() - kiln_temp_bias) * kiln_temp_step;
      newKilnTemp = Math.max(1400, Math.min(1500, newKilnTemp));
      
      // Feed rate
      const feed_rate_step = 0.5;
      newFeedRate = lastMetric.feed_rate + (Math.random() - 0.5) * feed_rate_step;

      // Raw mix composition
      const lsf_change = tempLsf - lastMetric.lsf;
      newCao = lastMetric.cao + (lsf_change * 0.1) + (Math.random() - 0.5) * 0.08;
      newSio2 = lastMetric.sio2 - (lsf_change * 0.05) + (Math.random() - 0.5) * 0.05;
      newAl2o3 = lastMetric.al2o3 + (Math.random() - 0.5) * 0.05;
      newFe2o3 = lastMetric.fe2o3 + (Math.random() - 0.5) * 0.05;

      // Recalculate LSF from composition
      newLsf = calculateLSF(newCao, newSio2, newAl2o3, newFe2o3);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Common: Calculate Bogue phases and create metric
    // ═══════════════════════════════════════════════════════════════════
    const boguePhases = calculateBogue(newCao, newSio2, newAl2o3, newFe2o3);

    const newMetric: ProductionMetric = {
      timestamp: new Date().toISOString(),
      plant_id: 'poc_plant_01',
      kiln_temp: parseFloat(newKilnTemp.toFixed(2)),
      feed_rate: parseFloat(newFeedRate.toFixed(2)),
      lsf: parseFloat(newLsf.toFixed(2)),
      cao: parseFloat(newCao.toFixed(2)),
      sio2: parseFloat(newSio2.toFixed(2)),
      al2o3: parseFloat(newAl2o3.toFixed(2)),
      fe2o3: parseFloat(newFe2o3.toFixed(2)),
      c3s: parseFloat(boguePhases.c3s.toFixed(2)),
      c2s: parseFloat(boguePhases.c2s.toFixed(2)),
      c3a: parseFloat(boguePhases.c3a.toFixed(2)),
      c4af: parseFloat(boguePhases.c4af.toFixed(2)),
    };

    await insertMetric(newMetric);

    return NextResponse.json(
      { 
        success: true, 
        newMetric, 
        optimizationActive: optimizationTarget.active,
        optimizationProgress: optimizationTarget.active ? 
          {
            currentTick: optimizationTarget.totalTicks - optimizationTarget.ticksRemaining,
            totalTicks: optimizationTarget.totalTicks,
            percentage: ((optimizationTarget.totalTicks - optimizationTarget.ticksRemaining) / optimizationTarget.totalTicks * 100).toFixed(0) + '%',
            lsfCurrent: newLsf.toFixed(2),
            lsfTarget: optimizationTarget.targetLSF.toFixed(2),
            lsfDelta: Math.abs(newLsf - optimizationTarget.targetLSF).toFixed(2),
          } : null,
        mode: optimizationTarget.active ? 'OPTIMIZATION' : 'NORMAL'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[INGEST] ❌ Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to ingest data.', error: error.message },
      { status: 500 }
    );
  }
}