/**
 * Number Formatting Utility
 * Formats numbers for display using Intl.NumberFormat
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    style?: "decimal" | "currency" | "percent" | "unit";
    unit?: string;
  } = {}
): string {
  const { decimals = 2, style = "decimal", unit } = options;
  
  return new Intl.NumberFormat("en-US", {
    style,
    unit,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Relative Time Display
 * Converts a timestamp to relative time (e.g., "5m ago", "2h ago")
 */
export function getRelativeTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Format timestamp for display (client-safe)
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time for chart display (HH:MM)
 */
export function formatChartTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Usage Examples:
 * 
 * // Temperature
 * formatNumber(1450.234); // "1,450.23"
 * formatNumber(1450.234, { decimals: 1 }); // "1,450.2"
 * 
 * // Percentages
 * formatNumber(96.789, { decimals: 1 }); // "96.8"
 * 
 * // Relative time
 * getRelativeTime(new Date(Date.now() - 300000)); // "5m ago"
 */