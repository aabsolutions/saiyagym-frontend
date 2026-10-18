import { PlanResponseDto } from '../../../api/models/plan-response-dto';
import { CreatePlanDto } from '../../../api/models/create-plan-dto';
import { UpdatePlanDto } from '../../../api/models/update-plan-dto';
import { FEATURE_KEYS, FeatureKey, LIMIT_KEYS, LimitKey } from '../../../core/plans/entitlements';
import {
  Translatable,
  fromTranslatable,
  toOptionalTranslatable,
  toTranslatable,
} from '../../../shared/i18n/translatable';

/** Same pattern as the API (CreatePlanDto.code). */
export const PLAN_CODE_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/;

/** A numeric entitlement where `null` means "unlimited" in the API. */
export interface Quota {
  unlimited: boolean;
  value: number | null;
}

export interface PlanFormModel {
  code: string;
  name: Translatable;
  description: Translatable;
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
  limits: Record<LimitKey, Quota>;
  features: Record<FeatureKey, boolean>;
  statsHistory: Quota;
}

const quota = (value: number | null | undefined, fallback: number): Quota =>
  value === null || value === undefined
    ? { unlimited: true, value: fallback }
    : { unlimited: false, value };

const fromQuota = (q: Quota): number | null => (q.unlimited ? null : (q.value ?? 0));

export function toPlanForm(plan: PlanResponseDto | null): PlanFormModel {
  const e = plan?.entitlements;
  return {
    code: plan?.code ?? '',
    name: fromTranslatable(plan?.name),
    description: fromTranslatable(plan?.description),
    active: plan?.active ?? true,
    isDefault: plan?.isDefault ?? false,
    sortOrder: plan?.sortOrder ?? 0,
    limits: Object.fromEntries(
      LIMIT_KEYS.map((key) => [key, quota(plan ? e?.limits[key] : 0, 0)]),
    ) as Record<LimitKey, Quota>,
    features: Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, e?.features[key] ?? false]),
    ) as Record<FeatureKey, boolean>,
    statsHistory: quota(plan ? e?.statsHistoryDays : 90, 90),
  };
}

function entitlementsOf(model: PlanFormModel) {
  return {
    limits: Object.fromEntries(
      LIMIT_KEYS.map((key) => [key, fromQuota(model.limits[key])]),
    ) as Record<LimitKey, number | null>,
    features: { ...model.features },
    statsHistoryDays: fromQuota(model.statsHistory),
  };
}

export function toCreatePlanDto(model: PlanFormModel): CreatePlanDto {
  const description = toOptionalTranslatable(model.description);
  return {
    code: model.code.trim(),
    name: toTranslatable(model.name),
    ...(description && { description }),
    active: model.active,
    isDefault: model.isDefault,
    sortOrder: model.sortOrder,
    entitlements: entitlementsOf(model),
  };
}

/** The code is immutable (users reference the plan by id; seeds by code). */
export function toUpdatePlanDto(model: PlanFormModel): UpdatePlanDto {
  // The API requires the default language in any description it receives.
  const description = toOptionalTranslatable(model.description);
  return {
    name: toTranslatable(model.name),
    ...(description && { description }),
    active: model.active,
    isDefault: model.isDefault,
    sortOrder: model.sortOrder,
    entitlements: entitlementsOf(model),
  };
}
