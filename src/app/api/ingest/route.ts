'use server';

import { NextResponse } from 'next/server';
import { getLatestMetric, insertMetric, ProductionMetric } from '@/lib/data/metrics';

// Bogue's Equations to calculate clinker phases
const calculateBogue = (cao: number, sio2: number, al2o3: number, fe2o3: number) => {
  const cao_prime = Math.max(0, cao - 1.5); // Assume 1.5% free lime for calculation
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

// Critical Limits for simulation
const KILN_TEMP_CRITICAL_HIGH = 1490;
const KILN_TEMP_CRITICAL_LOW = 1410;
const LSF_CRITICAL_HIGH = 100;
const LSF_CRITICAL_LOW = 92;

// Scenario state (simple in-memory state)
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
 * API route handler for ingesting data.
 * Generates a mock production metric and saves it to Supabase (Postgres).
 */
export async function POST() {
  try {
    const previousMetric = await getLatestMetric();

    let lastMetric: ProductionMetric;

    if (!previousMetric) {
      // If no data, start with a default metric
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

    // --- Scenario Management ---
    if (scenario.active && scenario.ticksRemaining > 0) {
      scenario.ticksRemaining--;
    } else if (scenario.active) {
      scenario.active = false; // Scenario ends
    } else if (Math.random() < 0.05) { // 5% chance to start a new scenario
      scenario.active = true;
      scenario.ticksRemaining = Math.floor(Math.random() * 11) + 20; // 20-30 ticks
      const targetHigh = Math.random() > 0.5;
      const targetMetric = Math.random() > 0.5 ? 'kiln_temp' : 'lsf';
      
      scenario.targetMetric = targetMetric;

      if (targetMetric === 'kiln_temp') {
        scenario.targetValue = targetHigh ? KILN_TEMP_CRITICAL_HIGH + 5 : KILN_TEMP_CRITICAL_LOW - 5;
        scenario.bias = targetHigh ? 0.4 : 0.6; // Trend up or down
      } else { // lsf
        scenario.targetValue = targetHigh ? LSF_CRITICAL_HIGH + 1.5 : LSF_CRITICAL_LOW - 1.5;
        scenario.bias = targetHigh ? 0.4 : 0.6;
      }
    }

    // --- Metric Simulation ---
    const isLsfScenario = scenario.active && scenario.targetMetric === 'lsf';
    let lsf_bias = isLsfScenario ? scenario.bias : 0.5;

    // Apply a corrective "mean reversion" force if LSF is outside critical thresholds and not in a scenario
    if (!isLsfScenario) {
      if (lastMetric.lsf > LSF_CRITICAL_HIGH) {
        lsf_bias = 0.7; // Trend down faster
      } else if (lastMetric.lsf < LSF_CRITICAL_LOW) {
        lsf_bias = 0.3; // Trend up faster
      }
    }

    const lsf_step = 0.1;
    const newLsf = lastMetric.lsf + (Math.random() - lsf_bias) * lsf_step;
    
    let kiln_temp_bias = (scenario.active && scenario.targetMetric === 'kiln_temp') ? scenario.bias : 0.5;

    // Apply a corrective "mean reversion" force if kiln temp is outside critical thresholds and not in a scenario
    if (!scenario.active || scenario.targetMetric !== 'kiln_temp') {
      if (lastMetric.kiln_temp > KILN_TEMP_CRITICAL_HIGH) {
        kiln_temp_bias = 0.6; // Trend down
      } else if (lastMetric.kiln_temp < KILN_TEMP_CRITICAL_LOW) {
        kiln_temp_bias = 0.4; // Trend up
      }
    }

    // 1. Primary Metrics ("Drivers")
    const kiln_temp_step = 1.5;
    const newKilnTemp = lastMetric.kiln_temp + (Math.random() - kiln_temp_bias) * kiln_temp_step;
    
    const feed_rate_step = 0.5;
    const newFeedRate = lastMetric.feed_rate + (Math.random() - 0.5) * feed_rate_step;

    // 2. Relational Metrics ("Followers")
    const newAl2o3 = lastMetric.al2o3 + (Math.random() - 0.5) * 0.05;
    const newFe2o3 = lastMetric.fe2o3 + (Math.random() - 0.5) * 0.05;

    const lsf_change = newLsf - lastMetric.lsf;
    const newCao = lastMetric.cao + (lsf_change * 0.1);
    const newSio2 = lastMetric.sio2 - (lsf_change * 0.05);
    
    // 3. Calculated Metrics (Bogue's Equations)
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
      { success: true, newMetric },
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
