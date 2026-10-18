import { Params } from '@angular/router';
import { ExercisesControllerList$Params } from '../../api/fn/exercises/exercises-controller-list';
import {
  EQUIPMENT,
  Equipment,
  MECHANICS,
  MUSCLES,
  Mechanic,
  Muscle,
  TIER_GOALS,
  Tier,
  TierGoal,
  isTier,
} from '../../shared/exercises/exercise-taxonomy';

export interface ExerciseFilters {
  q: string;
  muscle: Muscle | null;
  equipment: Equipment | null;
  mechanic: Mechanic | null;
  tier: Tier | null;
  /** Which goal's tier to filter by and to show on the chips. Always set. */
  goal: TierGoal;
  tag: string | null;
  favorites: boolean;
  custom: boolean;
}

export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export function emptyFilters(goal: TierGoal): ExerciseFilters {
  return {
    q: '',
    muscle: null,
    equipment: null,
    mechanic: null,
    tier: null,
    goal,
    tag: null,
    favorites: false,
    custom: false,
  };
}

const pick = <T extends string>(allowed: readonly T[], value: unknown): T | null =>
  (allowed as readonly unknown[]).includes(value) ? (value as T) : null;

/** Query string → filters. Unknown/invalid values are dropped (it is user-editable input). */
export function filtersFromParams(params: Params, defaultGoal: TierGoal): ExerciseFilters {
  const str = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : '');
  return {
    q: str('q').slice(0, 100),
    muscle: pick(MUSCLES, params['muscle']),
    equipment: pick(EQUIPMENT, params['equipment']),
    mechanic: pick(MECHANICS, params['mechanic']),
    tier: isTier(params['tier']) ? params['tier'] : null,
    goal: pick(TIER_GOALS, params['goal']) ?? defaultGoal,
    tag: str('tag') || null,
    favorites: params['favorites'] === '1',
    custom: params['custom'] === '1',
  };
}

export function pageFromParams(params: Params): { page: number; limit: number } {
  const page = Number(params['page']);
  const limit = Number(params['limit']);
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_PAGE_SIZE,
  };
}

/** Filters → query string: only what differs from the defaults, so URLs stay short. */
export function filtersToParams(
  filters: ExerciseFilters,
  page: number,
  limit: number,
  defaultGoal: TierGoal,
): Params {
  return {
    q: filters.q.trim() || null,
    muscle: filters.muscle,
    equipment: filters.equipment,
    mechanic: filters.mechanic,
    tier: filters.tier,
    goal: filters.goal === defaultGoal ? null : filters.goal,
    tag: filters.tag,
    favorites: filters.favorites ? '1' : null,
    custom: filters.custom ? '1' : null,
    page: page > 1 ? page : null,
    limit: limit === DEFAULT_PAGE_SIZE ? null : limit,
  };
}

/** Filters → GET /exercises params. `goal` is only meaningful (and required) with `tier`. */
export function toListParams(
  filters: ExerciseFilters,
  page: number,
  limit: number,
): ExercisesControllerList$Params {
  const q = filters.q.trim();
  return {
    ...(q && { q }),
    ...(filters.muscle && { muscle: filters.muscle }),
    ...(filters.equipment && { equipment: filters.equipment }),
    ...(filters.mechanic && { mechanic: filters.mechanic }),
    ...(filters.tier && { tier: filters.tier, goal: filters.goal }),
    ...(filters.tag && { tag: filters.tag }),
    ...(filters.favorites && { favorites: true }),
    ...(filters.custom && { custom: true }),
    sort: q ? 'relevance' : 'name',
    page,
    limit,
  };
}

export function activeFilterCount(filters: ExerciseFilters): number {
  return [
    filters.muscle,
    filters.equipment,
    filters.mechanic,
    filters.tier,
    filters.tag,
    filters.favorites || null,
    filters.custom || null,
  ].filter((v) => v !== null).length;
}
