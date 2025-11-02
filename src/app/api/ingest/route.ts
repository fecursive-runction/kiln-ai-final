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

const KILN_TEMP_CRITICAL_HIGH = 1490;
const KILN_TEMP_CRITICAL_LOW = 1410;
const LSF_CRITICAL_HIGH = 100;
const LSF_CRITICAL_LOW = 92;

// Optimization target - when active, it COMPLETELY controls data generation
let optimizationTarget: {
  active: boolean;
  targetLSF: number;
  targetFeedRate: number;
  targetCaO: number;
  targetSiO2: number;
  targetAl2O3: number;
  targetKilnTemp: number;
  ticksRemaining: number;
  startingLSF: number;
  startingCaO: number;
  startingSiO2: number;
  startingAl2O3: number;
  startingFeedRate: number;
  startingKilnTemp: number;
} = {
  active: false,
  targetLSF: 96,
  targetFeedRate: 220,
  targetCaO: 43.5,
  targetSiO2: 13.5,
  targetAl2O3: 3.5,
  targetKilnTemp: 1450,
  ticksRemaining: 0,
  startingLSF: 96,
  startingCaO: 43.5,
  startingSiO2: 13.5,
  startingAl2O3: 3.5,
  startingFeedRate: 220,
  startingKilnTemp: 1450,
};

// Scenario state - ONLY active when optimization is NOT active
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
 * Activate optimization - calculates target composition from LSF target
 */
export async function activateOptimizationTarget(
  predictedLSF: number,
  feedRateSetpoint: number,
  limestoneAdj: number,
  clayAdj: number
) {
  const currentMetric = await getLatestMetric();
  if (!currentMetric) return;

  // Calculate target composition based on adjustments
  const targetCaO = currentMetric.cao * (1 + limestoneAdj);
  const targetSiO2 = currentMetric.sio2 * (1 + clayAdj);
  const targetAl2O3 = currentMetric.al2o3 * (1 + clayAdj * 0.5);
  
  // Calculate target kiln temp based on LSF change
  const lsfDiff = predictedLSF - currentMetric.lsf;
  let tempAdjustment = 0;
  if (Math.abs(lsfDiff) > 5) {
    tempAdjustment = lsfDiff > 0 ? 10 : -10;
  } else if (Math.abs(lsfDiff) > 2) {
    tempAdjustment = lsfDiff > 0 ? 5 : -5;
  } else {
    tempAdjustment = lsfDiff > 0 ? 2 : -2;
  }
  const targetKilnTemp = Math.max(1420, Math.min(1470, currentMetric.kiln_temp + tempAdjustment));

  optimizationTarget = {
    active: true,
    targetLSF: predictedLSF,
    targetFeedRate: feedRateSetpoint,
    targetCaO: targetCaO,
    targetSiO2: targetSiO2,
    targetAl2O3: targetAl2O3,
    targetKilnTemp: targetKilnTemp,
    ticksRemaining: 40, // 40 ticks = ~3.3 minutes
    startingLSF: currentMetric.lsf,
    startingCaO: currentMetric.cao,
    startingSiO2: currentMetric.sio2,
    startingAl2O3: currentMetric.al2o3,
    startingFeedRate: currentMetric.feed_rate,
    startingKilnTemp: currentMetric.kiln_temp,
  };

  // DISABLE scenarios during optimization
  scenario.active = false;
  scenario.ticksRemaining = 0;

  console.log('[INGEST] ═══════════════════════════════════════');
  console.log('[INGEST] 🎯 OPTIMIZATION MODE ACTIVATED');
  console.log('[INGEST] ═══════════════════════════════════════');
  console.log('[INGEST] Starting LSF:', currentMetric.lsf.toFixed(1), '% → Target:', predictedLSF.toFixed(1), '%');
  console.log('[INGEST] Starting CaO:', currentMetric.cao.toFixed(2), '% → Target:', targetCaO.toFixed(2), '%');
  console.log('[INGEST] Starting SiO2:', currentMetric.sio2.toFixed(2), '% → Target:', targetSiO2.toFixed(2), '%');
  console.log('[INGEST] Starting Temp:', currentMetric.kiln_temp.toFixed(1), '°C → Target:', targetKilnTemp.toFixed(1), '°C');
  console.log('[INGEST] Duration: 40 ticks (~3.3 minutes)');
  console.log('[INGEST] Normal data trends SUSPENDED');
  console.log('[INGEST] ═══════════════════════════════════════');
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

    // ═══════════════════════════════════════════════════════
    // OPTIMIZATION MODE - Complete control over data generation
    // ═══════════════════════════════════════════════════════
    if (optimizationTarget.active && optimizationTarget.ticksRemaining > 0) {
      const tickNumber = 40 - optimizationTarget.ticksRemaining + 1;
      const progress = tickNumber / 40; // 0.0 to 1.0

      // Smooth interpolation from starting values to targets
      // Using easeInOutQuad for natural deceleration as we approach target
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Calculate interpolated values with small random noise for realism
      newCao = optimizationTarget.startingCaO + 
               (optimizationTarget.targetCaO - optimizationTarget.startingCaO) * easeProgress +
               (Math.random() - 0.5) * 0.02;

      newSio2 = optimizationTarget.startingSiO2 + 
                (optimizationTarget.targetSiO2 - optimizationTarget.startingSiO2) * easeProgress +
                (Math.random() - 0.5) * 0.02;

      newAl2o3 = optimizationTarget.startingAl2O3 + 
                 (optimizationTarget.targetAl2O3 - optimizationTarget.startingAl2O3) * easeProgress +
                 (Math.random() - 0.5) * 0.01;

      newFe2o3 = lastMetric.fe2o3 + (Math.random() - 0.5) * 0.02; // Small drift

      newKilnTemp = optimizationTarget.startingKilnTemp + 
                    (optimizationTarget.targetKilnTemp - optimizationTarget.startingKilnTemp) * easeProgress +
                    (Math.random() - 0.5) * 0.5;

      newFeedRate = optimizationTarget.startingFeedRate + 
                    (optimizationTarget.targetFeedRate - optimizationTarget.startingFeedRate) * easeProgress +
                    (Math.random() - 0.5) * 0.3;

      // Calculate LSF from composition
      newLsf = calculateLSF(newCao, newSio2, newAl2o3, newFe2o3);

      const lsfDistance = Math.abs(newLsf - optimizationTarget.targetLSF);
      
      console.log(`[INGEST] [OPT] Tick ${tickNumber}/40 (${(progress * 100).toFixed(0)}%) - LSF: ${newLsf.toFixed(1)}% → ${optimizationTarget.targetLSF.toFixed(1)}% (Δ${lsfDistance.toFixed(1)}%)`);

      optimizationTarget.ticksRemaining--;

      // Check if target achieved
      const isLSFAchieved = lsfDistance < 0.5;
      const tempDistance = Math.abs(newKilnTemp - optimizationTarget.targetKilnTemp);
      const isTempAchieved = tempDistance < 2.0;
      
      if (optimizationTarget.ticksRemaining === 0 || (isLSFAchieved && isTempAchieved)) {
        console.log('[INGEST] ═══════════════════════════════════════');
        console.log('[INGEST] ✅ OPTIMIZATION TARGET ACHIEVED');
        console.log('[INGEST] ═══════════════════════════════════════');
        console.log(`[INGEST] Final LSF: ${newLsf.toFixed(1)}% (Target: ${optimizationTarget.targetLSF.toFixed(1)}%)`);
        console.log(`[INGEST] Final CaO: ${newCao.toFixed(2)}% (Target: ${optimizationTarget.targetCaO.toFixed(2)}%)`);
        console.log(`[INGEST] Final SiO2: ${newSio2.toFixed(2)}% (Target: ${optimizationTarget.targetSiO2.toFixed(2)}%)`);
        console.log(`[INGEST] Final Temp: ${newKilnTemp.toFixed(1)}°C (Target: ${optimizationTarget.targetKilnTemp.toFixed(1)}°C)`);
        console.log(`[INGEST] Completed in ${tickNumber} ticks`);
        console.log('[INGEST] 🔄 RESUMING NORMAL DATA TRENDS');
        console.log('[INGEST] ═══════════════════════════════════════');
        optimizationTarget.active = false;
      } else if (tickNumber % 8 === 0) {
        console.log(`[INGEST] [OPT] 📊 Progress: ${(progress * 100).toFixed(0)}% - ${optimizationTarget.ticksRemaining} ticks remaining`);
      }

    } 
    // ═══════════════════════════════════════════════════════
    // NORMAL MODE - Standard data generation with trends
    // ═══════════════════════════════════════════════════════
    else {
      // Scenario Management (only when optimization is NOT active)
      if (scenario.active && scenario.ticksRemaining > 0) {
        scenario.ticksRemaining--;
      } else if (scenario.active) {
        console.log('[INGEST] [NORMAL] Scenario ended, resuming stable trends');
        scenario.active = false;
      } else if (Math.random() < 0.02) { // 2% chance of scenario
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
        console.log(`[INGEST] [NORMAL] ⚠️ Scenario triggered: ${targetMetric} → ${scenario.targetValue.toFixed(1)}`);
      }

      // LSF bias
      const isLsfScenario = scenario.active && scenario.targetMetric === 'lsf';
      let lsf_bias = isLsfScenario ? scenario.bias : 0.5;

      if (!isLsfScenario) {
        if (lastMetric.lsf > LSF_CRITICAL_HIGH) {
          lsf_bias = 0.7; // Bias downward
        } else if (lastMetric.lsf < LSF_CRITICAL_LOW) {
          lsf_bias = 0.3; // Bias upward
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

    // ═══════════════════════════════════════════════════════
    // Common: Calculate Bogue phases and create metric
    // ═══════════════════════════════════════════════════════
    const boguePhases = calculateBogue(newCao, newSio2, newAl2o3, newFe2o3);

    const newMetric: ProductionMetric = {
      timestamp: new Date().toISOString(),
      plant_id: 'poc_plant_01',
      kiln_temp: parseFloat(newKilnTemp.toFixed(2)),
      feed_rate: parseFloat(newFeedRate.toFixed(2)),
      lsf: parseFloat(newLsf.toFixed(1)),
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