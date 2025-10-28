import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    style?: "decimal" | "currency" | "percent" | "unit";
    unit?: string;
  } = {}
) {
  const { decimals = 2, style = "decimal", unit } = options;
  return new Intl.NumberFormat("en-US", {
    style,
    unit,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
