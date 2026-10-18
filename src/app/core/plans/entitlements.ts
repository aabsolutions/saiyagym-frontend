import { PlanFeaturesDto } from '../../api/models/plan-features-dto';
import { PlanLimitsDto } from '../../api/models/plan-limits-dto';
import { apiErrorBody } from '../http/api-error';

export type FeatureKey = keyof PlanFeaturesDto;
export type LimitKey = keyof PlanLimitsDto;

/** Display order; also the source for the plans comparison table. */
export const FEATURE_KEYS: readonly FeatureKey[] = [
  'fullStats',
  'autoProgression',
  'progressPhotos',
  'fullNutrition',
  'dataExport',
];
export const LIMIT_KEYS: readonly LimitKey[] = ['routines', 'activePrograms', 'customExercises'];

/** What a PLAN_* error tells us, so the UI can offer the upgrade path. */
export type PlanRestriction =
  | { kind: 'feature'; feature: FeatureKey | null }
  | { kind: 'limit'; resource: LimitKey | null; limit: number | null };

const isFeatureKey = (value: unknown): value is FeatureKey =>
  (FEATURE_KEYS as readonly unknown[]).includes(value);
const isLimitKey = (value: unknown): value is LimitKey =>
  (LIMIT_KEYS as readonly unknown[]).includes(value);

/**
 * 403 PLAN_FEATURE_REQUIRED `{ details: { feature } }` or
 * 403 PLAN_LIMIT_REACHED `{ details: { resource, limit, current, requested } }`.
 */
export function planRestrictionOf(error: unknown): PlanRestriction | null {
  const body = apiErrorBody(error);
  if (!body) return null;
  const details = (
    typeof body.details === 'object' && body.details !== null ? body.details : {}
  ) as Record<string, unknown>;
  if (body.code === 'PLAN_FEATURE_REQUIRED') {
    return {
      kind: 'feature',
      feature: isFeatureKey(details['feature']) ? details['feature'] : null,
    };
  }
  if (body.code === 'PLAN_LIMIT_REACHED') {
    return {
      kind: 'limit',
      resource: isLimitKey(details['resource']) ? details['resource'] : null,
      limit: typeof details['limit'] === 'number' ? details['limit'] : null,
    };
  }
  return null;
}
