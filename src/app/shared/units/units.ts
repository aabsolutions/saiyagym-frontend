/** The API stores ONLY kg and cm. Imperial is a presentation concern. */
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export type UnitSystem = 'metric' | 'imperial';

export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;
export const cmToIn = (cm: number): number => cm / CM_PER_IN;
export const inToCm = (inches: number): number => inches * CM_PER_IN;

const formatters = new Map<string, Intl.NumberFormat>();

export function formatNumber(value: number, locale: string, maxFractionDigits: number): string {
  const key = `${locale}|${maxFractionDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}
