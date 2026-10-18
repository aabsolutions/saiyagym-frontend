import { AdminExerciseDto } from '../../../api/models/admin-exercise-dto';
import { BulkTierItemDto } from '../../../api/models/bulk-tier-item-dto';
import { Tier, TierGoal } from '../../../shared/exercises/exercise-taxonomy';

/** Pending edits: exercise id → goal → new tier (null clears it). */
export type TierChanges = Record<string, Partial<Record<TierGoal, Tier | null>>>;

/** Setting a tier back to its stored value drops the change (nothing to send). */
export function setTierChange(
  changes: TierChanges,
  exercise: AdminExerciseDto,
  goal: TierGoal,
  tier: Tier | null,
): TierChanges {
  const forExercise = { ...changes[exercise.id] };
  if (exercise.tiers[goal] === tier) delete forExercise[goal];
  else forExercise[goal] = tier;
  const next = { ...changes };
  if (Object.keys(forExercise).length) next[exercise.id] = forExercise;
  else delete next[exercise.id];
  return next;
}

export const tierOf = (changes: TierChanges, exercise: AdminExerciseDto, goal: TierGoal) =>
  changes[exercise.id] && goal in changes[exercise.id]
    ? (changes[exercise.id][goal] ?? null)
    : exercise.tiers[goal];

/** One PATCH /admin/exercises/tiers with only the goals that changed. */
export const toBulkItems = (changes: TierChanges): BulkTierItemDto[] =>
  Object.entries(changes).map(([id, goals]) => ({ id, ...goals }));

export const changeCount = (changes: TierChanges): number =>
  Object.values(changes).reduce((n, goals) => n + Object.keys(goals).length, 0);
