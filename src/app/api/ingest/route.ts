// src/app/api/ingest/route.ts - Database-persisted optimization state
'use server';

import { NextResponse } from 'next/server';
import { getLatestMetric, insertMetric, ProductionMetric } from '@/lib/data/metrics';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

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

const calculateCaoFromLSF = (targetLSF: number, sio2: number, al2o3: number, fe2o3: number): number => {
  const denominator = 2.8 * sio2 + 1.18 * al2o3 + 0.65 * fe2o3;
  return (targetLSF / 100) * denominator;
};

const KILN_TEMP_CRITICAL_HIGH = 1490;
const KILN_TEMP_CRITICAL_LOW = 1410;
const LSF_CRITICAL_HIGH = 100;
const LSF_CRITICAL_LOW = 92;

// Helper functions for database-backed optimization state
async function getOptimizationState() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('optimization_state')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (error) {
    console.error('[OPT-STATE] Error reading state:', error);
    return null;
  }
  return data;
}

async function saveOptimizationState(state: any) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('optimization_state')
    .upsert({
      id: 1,
      ...state,
      updated_at: new Date().toISOString(),
    });
  
  if (error) {
    console.error('[OPT-STATE] Error saving state:', error);
    throw error;
  }
}

async function clearOptimizationState() {
  await saveOptimizationState({ active: false });
}

/**
 * Activate optimization - saves state to database for persistence
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

  const targetCaO = currentMetric.cao * (1 + limestoneAdj);
  const targetSiO2 = currentMetric.sio2 * (1 + clayAdj);
  const targetAl2O3 = currentMetric.al2o3 * (1 + clayAdj * 0.5);
  
  const lsfDiff = predictedLSF - currentMetric.lsf;
  let tempAdjustment = 0;
  
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

  const optimizationState = {
    active: true,
    target_lsf: predictedLSF,
    target_feed_rate: feedRateSetpoint,
    target_kiln_temp: targetKilnTemp,
    ticks_remaining: 40,
    total_ticks: 40,
    starting_lsf: currentMetric.lsf,
    starting_cao: currentMetric.cao,
    starting_sio2: currentMetric.sio2,
    starting_al2o3: currentMetric.al2o3,
    starting_fe2o3: currentMetric.fe2o3,
    starting_feed_rate: currentMetric.feed_rate,
    starting_kiln_temp: currentMetric.kiln_temp,
    target_cao: targetCaO,
    target_sio2: targetSiO2,
    target_al2o3: targetAl2O3,
    limestone_adj: limestoneAdj,
    clay_adj: clayAdj,
  };

  await saveOptimizationState(optimizationState);

  console.log('[OPT] ═══════════════════════════════════════════════════════');
  console.log('[OPT] 🎯 OPTIMIZATION MODE ACTIVATED - DATABASE PERSISTED');
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
  console.log('[OPT] Method: Direct LSF interpolation with database persistence');
  console.log('[OPT] State saved to database - survives server restarts');
  console.log('[OPT] ═══════════════════════════════════════════════════════');
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Fallback scenario system (only runs when optimization is off)
let scenario = {
  active: false,
  targetMetric: 'kiln_temp' as 'kiln_temp' | 'lsf',
  targetValue: 1450,
  ticksRemaining: 0,
  bias: 0.5,
};

export async function POST() {
  try {
    // Load optimization state from database
    const optState = await getOptimizationState();
    
    if (optState?.active) {
      console.log(`[INGEST] 🎯 OPTIMIZATION ACTIVE - Tick ${optState.total_ticks - optState.ticks_remaining + 1}/${optState.total_ticks}`);
    }

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
    // OPTIMIZATION MODE - Database-backed, survives restarts
    // ═══════════════════════════════════════════════════════════════════
    if (optState?.active && optState.ticks_remaining > 0) {
      const tickNumber = optState.total_ticks - optState.ticks_remaining + 1;
      const progress = tickNumber / optState.total_ticks;
      const easeProgress = easeInOutCubic(progress);

      // Direct LSF interpolation (prevents oscillation)
      newLsf = optState.starting_lsf + 
               (optState.target_lsf - optState.starting_lsf) * easeProgress;
      
      newSio2 = optState.starting_sio2 + 
                (optState.target_sio2 - optState.starting_sio2) * easeProgress;

      newAl2o3 = optState.starting_al2o3 + 
                 (optState.target_al2o3 - optState.starting_al2o3) * easeProgress;

      newFe2o3 = optState.starting_fe2o3;

      // Back-calculate CaO from target LSF
      newCao = calculateCaoFromLSF(newLsf, newSio2, newAl2o3, newFe2o3);

      newKilnTemp = optState.starting_kiln_temp + 
                    (optState.target_kiln_temp - optState.starting_kiln_temp) * easeProgress;

      newFeedRate = optState.starting_feed_rate + 
                    (optState.target_feed_rate - optState.starting_feed_rate) * easeProgress;

      const lsfDistance = Math.abs(newLsf - optState.target_lsf);
      const caoDistance = Math.abs(newCao - optState.target_cao);
      const sio2Distance = Math.abs(newSio2 - optState.target_sio2);
      const tempDistance = Math.abs(newKilnTemp - optState.target_kiln_temp);
      
      if (tickNumber % 5 === 0 || tickNumber === 1 || tickNumber === optState.total_ticks) {
        console.log(`[OPT] ─────────── Tick ${tickNumber}/${optState.total_ticks} (${(progress * 100).toFixed(0)}%) ───────────`);
        console.log(`[OPT] LSF:   ${newLsf.toFixed(2)}% → ${optState.target_lsf.toFixed(2)}% (Δ${lsfDistance.toFixed(2)}%)`);
        console.log(`[OPT] CaO:   ${newCao.toFixed(2)}% → ${optState.target_cao.toFixed(2)}% (Δ${caoDistance.toFixed(2)}%)`);
        console.log(`[OPT] SiO2:  ${newSio2.toFixed(2)}% → ${optState.target_sio2.toFixed(2)}% (Δ${sio2Distance.toFixed(2)}%)`);
        console.log(`[OPT] Temp:  ${newKilnTemp.toFixed(1)}°C → ${optState.target_kiln_temp.toFixed(1)}°C (Δ${tempDistance.toFixed(1)}°C)`);
      }

      // Update database with decremented ticks
      await saveOptimizationState({
        ...optState,
        ticks_remaining: optState.ticks_remaining - 1,
      });

      const isLSFAchieved = lsfDistance < 0.2;
      const isCaoAchieved = caoDistance < 0.1;
      const isSio2Achieved = sio2Distance < 0.05;
      const isTempAchieved = tempDistance < 1.5;
      
      const allTargetsAchieved = isLSFAchieved && isCaoAchieved && isSio2Achieved && isTempAchieved;
      
      if (optState.ticks_remaining <= 1 || allTargetsAchieved) {
        console.log('[OPT] ═══════════════════════════════════════════════════════');
        console.log('[OPT] ✅ OPTIMIZATION COMPLETE');
        console.log('[OPT] ═══════════════════════════════════════════════════════');
        console.log(`[OPT] Final LSF:   ${newLsf.toFixed(2)}% (Target: ${optState.target_lsf.toFixed(2)}%)`);
        console.log(`[OPT] Final CaO:   ${newCao.toFixed(2)}% (Target: ${optState.target_cao.toFixed(2)}%)`);
        console.log(`[OPT] Completed in ${tickNumber} ticks`);
        console.log('[OPT] 🔄 Resuming normal data generation');
        console.log('[OPT] ═══════════════════════════════════════════════════════');
        await clearOptimizationState();
      }

    } 
    // ═══════════════════════════════════════════════════════════════════
    // NORMAL MODE
    // ═══════════════════════════════════════════════════════════════════
    else {
      if (scenario.active && scenario.ticksRemaining > 0) {
        scenario.ticksRemaining--;
        if (scenario.ticksRemaining === 0) {
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
      }

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
      
      const feed_rate_step = 0.5;
      newFeedRate = lastMetric.feed_rate + (Math.random() - 0.5) * feed_rate_step;

      const lsf_change = tempLsf - lastMetric.lsf;
      newCao = lastMetric.cao + (lsf_change * 0.1) + (Math.random() - 0.5) * 0.08;
      newSio2 = lastMetric.sio2 - (lsf_change * 0.05) + (Math.random() - 0.5) * 0.05;
      newAl2o3 = lastMetric.al2o3 + (Math.random() - 0.5) * 0.05;
      newFe2o3 = lastMetric.fe2o3 + (Math.random() - 0.5) * 0.05;

      newLsf = calculateLSF(newCao, newSio2, newAl2o3, newFe2o3);
    }

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
        optimizationActive: optState?.active ?? false,
        optimizationProgress: optState?.active ? {
          currentTick: optState.total_ticks - optState.ticks_remaining,
          totalTicks: optState.total_ticks,
          percentage: ((optState.total_ticks - optState.ticks_remaining) / optState.total_ticks * 100).toFixed(0) + '%',
          lsfCurrent: newLsf.toFixed(2),
          lsfTarget: optState.target_lsf.toFixed(2),
          lsfDelta: Math.abs(newLsf - optState.target_lsf).toFixed(2),
        } : null,
        mode: optState?.active ? 'OPTIMIZATION' : 'NORMAL'
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