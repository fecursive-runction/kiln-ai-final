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

let optimizationTarget: {
  active: boolean;
  targetLSF: number;
  targetFeedRate: number;
  limestoneAdjustment: number;
  clayAdjustment: number;
  ticksRemaining: number;
  convergenceRate: number;
} = {
  active: false,
  targetLSF: 96,
  targetFeedRate: 220,
  limestoneAdjustment: 0,
  clayAdjustment: 0,
  ticksRemaining: 0,
  convergenceRate: 0.05,
};

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

export async function activateOptimizationTarget(
  predictedLSF: number,
  feedRateSetpoint: number,
  limestoneAdj: number,
  clayAdj: number
) {
  optimizationTarget = {
    active: true,
    targetLSF: predictedLSF,
    targetFeedRate: feedRateSetpoint,
    limestoneAdjustment: limestoneAdj,
    clayAdjustment: clayAdj,
    ticksRemaining: 60,
    convergenceRate: 0.05,
  };
  console.log('[INGEST] Optimization target activated:', optimizationTarget);
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

    let targetLSF = 96;
    let targetFeedRate = 220;
    let caoAdjustmentFactor = 0;
    let sio2AdjustmentFactor = 0;
    let al2o3AdjustmentFactor = 0;
    let kilnTempAdjustment = 0;

    if (optimizationTarget.active && optimizationTarget.ticksRemaining > 0) {
      targetLSF = optimizationTarget.targetLSF;
      targetFeedRate = optimizationTarget.targetFeedRate;

      const lsfDistance = Math.abs(lastMetric.lsf - targetLSF);
      const feedRateDistance = Math.abs(lastMetric.feed_rate - targetFeedRate);
      
      const convergenceMultiplier = Math.min(1, lsfDistance / 2);
      caoAdjustmentFactor = optimizationTarget.limestoneAdjustment * optimizationTarget.convergenceRate * (1 + convergenceMultiplier);
      sio2AdjustmentFactor = optimizationTarget.clayAdjustment * optimizationTarget.convergenceRate * -0.5 * (1 + convergenceMultiplier);
      al2o3AdjustmentFactor = optimizationTarget.clayAdjustment * optimizationTarget.convergenceRate * -0.5 * (1 + convergenceMultiplier);

      if (targetLSF > lastMetric.lsf + 0.5) {
        kilnTempAdjustment = 0.8;
      } else if (targetLSF < lastMetric.lsf - 0.5) {
        kilnTempAdjustment = -0.8;
      }

      optimizationTarget.ticksRemaining--;
      
      const isLSFAchieved = lsfDistance < 0.3;
      const isFeedRateAchieved = feedRateDistance < 0.5;
      
      if (optimizationTarget.ticksRemaining === 0 || (isLSFAchieved && isFeedRateAchieved)) {
        console.log('[INGEST] Optimization target achieved! LSF:', lastMetric.lsf.toFixed(1), 'Target:', targetLSF.toFixed(1));
        console.log('[INGEST] Feed Rate:', lastMetric.feed_rate.toFixed(1), 'Target:', targetFeedRate.toFixed(1));
        console.log('[INGEST] Resuming normal trending behavior');
        optimizationTarget.active = false;
      } else {
        console.log(`[INGEST] Converging... LSF: ${lastMetric.lsf.toFixed(1)} → ${targetLSF.toFixed(1)}, Ticks remaining: ${optimizationTarget.ticksRemaining}`);
      }
    }

    if (scenario.active && scenario.ticksRemaining > 0) {
      scenario.ticksRemaining--;
    } else if (scenario.active) {
      scenario.active = false;
    } else if (!optimizationTarget.active && Math.random() < 0.03) {
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
    }

    const isLsfScenario = scenario.active && scenario.targetMetric === 'lsf';
    let lsf_bias = isLsfScenario ? scenario.bias : 0.5;

    if (!isLsfScenario && !optimizationTarget.active) {
      if (lastMetric.lsf > LSF_CRITICAL_HIGH) {
        lsf_bias = 0.7;
      } else if (lastMetric.lsf < LSF_CRITICAL_LOW) {
        lsf_bias = 0.3;
      }
    }

    if (optimizationTarget.active) {
      if (lastMetric.lsf < targetLSF) {
        lsf_bias = 0.3;
      } else if (lastMetric.lsf > targetLSF) {
        lsf_bias = 0.7;
      }
    }

    const lsf_step = 0.15;
    let newLsf = lastMetric.lsf + (Math.random() - lsf_bias) * lsf_step;
    
    let kiln_temp_bias = (scenario.active && scenario.targetMetric === 'kiln_temp') ? scenario.bias : 0.5;

    if (!scenario.active || scenario.targetMetric !== 'kiln_temp') {
      if (lastMetric.kiln_temp > KILN_TEMP_CRITICAL_HIGH) {
        kiln_temp_bias = 0.6;
      } else if (lastMetric.kiln_temp < KILN_TEMP_CRITICAL_LOW) {
        kiln_temp_bias = 0.4;
      }
    }

    const kiln_temp_step = 1.5;
    let newKilnTemp = lastMetric.kiln_temp + (Math.random() - kiln_temp_bias) * kiln_temp_step;
    
    const feed_rate_step = 0.5;
    let newFeedRate: number;
    
    if (optimizationTarget.active) {
      const diff = targetFeedRate - lastMetric.feed_rate;
      newFeedRate = lastMetric.feed_rate + diff * optimizationTarget.convergenceRate + (Math.random() - 0.5) * feed_rate_step * 0.5;
    } else {
      newFeedRate = lastMetric.feed_rate + (Math.random() - 0.5) * feed_rate_step;
    }

    let newCao = lastMetric.cao;
    let newSio2 = lastMetric.sio2;
    let newAl2o3 = lastMetric.al2o3;
    const newFe2o3 = lastMetric.fe2o3 + (Math.random() - 0.5) * 0.05;

    if (optimizationTarget.active) {
      newCao = lastMetric.cao * (1 + caoAdjustmentFactor) + (Math.random() - 0.5) * 0.05;
      newSio2 = lastMetric.sio2 * (1 + sio2AdjustmentFactor) + (Math.random() - 0.5) * 0.05;
      newAl2o3 = lastMetric.al2o3 * (1 + al2o3AdjustmentFactor) + (Math.random() - 0.5) * 0.02;
    } else {
      const lsf_change = newLsf - lastMetric.lsf;
      newCao = lastMetric.cao + (lsf_change * 0.1) + (Math.random() - 0.5) * 0.08;
      newSio2 = lastMetric.sio2 - (lsf_change * 0.05) + (Math.random() - 0.5) * 0.05;
      newAl2o3 = lastMetric.al2o3 + (Math.random() - 0.5) * 0.05;
    }

    newLsf = calculateLSF(newCao, newSio2, newAl2o3, newFe2o3);
    
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
      { success: true, newMetric, optimizationActive: optimizationTarget.active },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in ingestion route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to ingest data.', error: error.message },
      { status: 500 }
    );
  }
}