/**
 * Operational Thresholds and Business Rules
 * Defines exact ranges for all production metrics
 */
export const THRESHOLDS = {
  LSF: {
    IDEAL_MIN: 94,
    IDEAL_MAX: 98,
    CRITICAL_LOW: 92,
    CRITICAL_HIGH: 100,
  },
  KILN_TEMP: {
    CRITICAL_LOW: 1420,
    WARNING_LOW: 1430,
    IDEAL_MIN: 1430,
    IDEAL_MAX: 1470,
    WARNING_HIGH: 1470,
    CRITICAL_HIGH: 1480,
  },
  FEED_RATE: {
    MIN: 210,
    MAX: 230,
    IDEAL: 220,
  },
  RAW_MIX: {
    CAO: { BASE: 43.5, VARIANCE: 1.5 },
    SIO2: { BASE: 13.5, VARIANCE: 1.0 },
    AL2O3: { BASE: 3.5, VARIANCE: 0.2 },
    FE2O3: { BASE: 2.0, VARIANCE: 0.2 },
  },
} as const;

/**
 * LSF Badge Color Variant
 * Returns the appropriate badge variant based on LSF value
 */
export function getLSFBadgeVariant(
  lsf: number
): 'default' | 'destructive' | 'secondary' {
  if (lsf < THRESHOLDS.LSF.IDEAL_MIN || lsf > THRESHOLDS.LSF.IDEAL_MAX) {
    return 'destructive'; // Red - out of ideal range
  }
  return 'secondary'; // Gray/Blue - normal
}

/**
 * Temperature Status and Color
 * Returns status and appropriate color class for temperature
 */
export function getTemperatureStatus(temp: number): {
  color: string;
  status: 'critical' | 'warning' | 'normal';
  label: string;
} {
  if (
    temp < THRESHOLDS.KILN_TEMP.CRITICAL_LOW ||
    temp > THRESHOLDS.KILN_TEMP.CRITICAL_HIGH
  ) {
    return { 
      color: 'text-red-500', 
      status: 'critical',
      label: 'Critical'
    };
  }
  
  if (
    temp < THRESHOLDS.KILN_TEMP.WARNING_LOW ||
    temp > THRESHOLDS.KILN_TEMP.WARNING_HIGH
  ) {
    return { 
      color: 'text-yellow-500', 
      status: 'warning',
      label: 'Warning'
    };
  }
  
  return { 
    color: 'text-green-500', 
    status: 'normal',
    label: 'Normal'
  };
}

/**
 * Alert Severity Styling
 * Visual styles for different alert severities
 */
export const ALERT_STYLES = {
  CRITICAL: {
    bgColor: 'bg-red-500',
    textColor: 'text-white',
    borderColor: 'border-red-500',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    icon: '🔴',
  },
  WARNING: {
    bgColor: 'bg-yellow-400',
    textColor: 'text-black',
    borderColor: 'border-yellow-400',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-800',
    icon: '⚠️',
  },
} as const;

/**
 * Check if LSF is in optimal range
 */
export function isLSFOptimal(lsf: number): boolean {
  return lsf >= THRESHOLDS.LSF.IDEAL_MIN && lsf <= THRESHOLDS.LSF.IDEAL_MAX;
}

/**
 * Check if temperature is in optimal range
 */
export function isTemperatureOptimal(temp: number): boolean {
  return (
    temp >= THRESHOLDS.KILN_TEMP.IDEAL_MIN &&
    temp <= THRESHOLDS.KILN_TEMP.IDEAL_MAX
  );
}

/**
 * Check if temperature requires an alert
 */
export function requiresTemperatureAlert(temp: number): boolean {
  return (
    temp < THRESHOLDS.KILN_TEMP.CRITICAL_LOW ||
    temp > THRESHOLDS.KILN_TEMP.CRITICAL_HIGH ||
    (temp >= THRESHOLDS.KILN_TEMP.WARNING_LOW &&
      temp < THRESHOLDS.KILN_TEMP.IDEAL_MIN) ||
    (temp > THRESHOLDS.KILN_TEMP.IDEAL_MAX &&
      temp <= THRESHOLDS.KILN_TEMP.WARNING_HIGH)
  );
}

/**
 * Get LSF recommendation message
 */
export function getLSFRecommendation(lsf: number): string {
  if (lsf < THRESHOLDS.LSF.IDEAL_MIN) {
    return `LSF is low (${lsf.toFixed(1)}%). Consider increasing limestone feed.`;
  }
  if (lsf > THRESHOLDS.LSF.IDEAL_MAX) {
    return `LSF is high (${lsf.toFixed(1)}%). Consider reducing limestone feed.`;
  }
  return `LSF is optimal (${lsf.toFixed(1)}%).`;
}