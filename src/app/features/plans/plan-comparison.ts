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

/** Rows: limits, stats history, then features — straight from each plan's entitlements. */
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
    ...FEATURE_KEYS.map(featureRow),
  ];
}
