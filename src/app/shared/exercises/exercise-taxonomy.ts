import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';

/** Enums from the API contract, in display order. Labels live in i18n (`exercises.<group>.<value>`). */
export type Muscle = ExerciseSummaryDto['primaryMuscle'];
export type Equipment = ExerciseSummaryDto['equipment'];
export type Mechanic = ExerciseSummaryDto['mechanic'];
export type Category = ExerciseSummaryDto['category'];
export type TierGoal = keyof ExerciseSummaryDto['tiers'];
export type Tier = NonNullable<ExerciseSummaryDto['tiers'][TierGoal]>;

export const MUSCLES: readonly Muscle[] = [
  'chest',
  'lats',
  'upper_back',
  'traps',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'lower_back',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'abductors',
  'calves',
];

export const EQUIPMENT: readonly Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'smith',
  'other',
];

export const MECHANICS: readonly Mechanic[] = ['compound', 'isolation'];
export const CATEGORIES: readonly Category[] = ['strength', 'powerlifting_main', 'accessory'];
export const TIERS: readonly Tier[] = ['S', 'A', 'B', 'C'];
export const TIER_GOALS: readonly TierGoal[] = ['hypertrophy', 'powerlifting'];

export const isTier = (value: unknown): value is Tier =>
  (TIERS as readonly unknown[]).includes(value);

/** Tiers are per goal; a profile goal of "both" (or none) defaults to hypertrophy. */
export function defaultTierGoal(profileGoal: string | null | undefined): TierGoal {
  return profileGoal === 'powerlifting' ? 'powerlifting' : 'hypertrophy';
}
