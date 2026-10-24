import { PlanEntitlementsDto } from '../../api/models/plan-entitlements-dto';
import { FEATURE_KEYS, FeatureKey, LIMIT_KEYS, LimitKey } from '../../core/plans/entitlements';

/** One cell, already decided; the template only picks the translation/icon. */
export type ComparisonCell =
  | { type: 'included'; value: boolean }
  | { type: 'limit'; value: number | null } // null = unlimited
  | { type: 'history'; days: number | null }; // null = full history

export interface ComparisonRow {
  /** Translation key of the row label. */
  labelKey: string;
  cells: ComparisonCell[];
}

/**
 * Rows: limits, stats history, guides per routine, then features — straight from each plan's
 * entitlements.
 */
export function buildComparison(
  plans: readonly { entitlements: PlanEntitlementsDto }[],
): ComparisonRow[] {
  const limitRow = (key: LimitKey): ComparisonRow => ({
    labelKey: `plans.limits.${key}`,
    cells: plans.map((p) => ({ type: 'limit', value: p.entitlements.limits[key] })),
  });
  const featureRow = (key: FeatureKey): ComparisonRow => ({
    labelKey: `plans.features.${key}`,
    cells: plans.map((p) => ({ type: 'included', value: p.entitlements.features[key] })),
  });
  return [
    ...LIMIT_KEYS.map(limitRow),
    {
      labelKey: 'plans.statsHistory',
      cells: plans.map((p) => ({ type: 'history', days: p.entitlements.statsHistoryDays })),
    },
    {
      labelKey: 'plans.guidesPerRoutine',
      // `null` = unlimited. Absent only on an API older than the field: nothing unlocked, like
      // the API's default (`??` would turn the unlimited `null` into 0 too).
      cells: plans.map((p) => {
        const value = p.entitlements.guidesPerRoutine;
        return { type: 'limit', value: value === undefined ? 0 : value };
      }),
    },
    ...FEATURE_KEYS.map(featureRow),
  ];
}
