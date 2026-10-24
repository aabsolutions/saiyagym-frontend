import { ExerciseDetailDto } from '../../api/models/exercise-detail-dto';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';

/** Test data factory (not a spec). */
export function exercise(overrides: Partial<ExerciseSummaryDto> = {}): ExerciseSummaryDto {
  return {
    id: overrides.id ?? 'ex-1',
    slug: null,
    name: 'Back squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes'],
    equipment: 'barbell',
    mechanic: 'compound',
    category: 'powerlifting_main',
    trackingType: 'weight_reps',
    imageUrl: null,
    personalTiers: { hypertrophy: null, powerlifting: null },
    tags: [],
    tiers: { hypertrophy: 'S', powerlifting: 'S' },
    isGlobal: true,
    isCustom: false,
    isFavorite: false,
    hasGuide: false,
    ...overrides,
  };
}

export function exerciseDetail(overrides: Partial<ExerciseDetailDto> = {}): ExerciseDetailDto {
  return { ...exercise(overrides), description: '', instructions: '', ...overrides };
}
