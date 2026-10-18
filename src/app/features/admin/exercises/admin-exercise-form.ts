import { required, schema, validate } from '@angular/forms/signals';
import { AdminExerciseDto } from '../../../api/models/admin-exercise-dto';
import { CreateGlobalExerciseDto } from '../../../api/models/create-global-exercise-dto';
import { UpdateGlobalExerciseDto } from '../../../api/models/update-global-exercise-dto';
import {
  Category,
  Equipment,
  Mechanic,
  Muscle,
  Tier,
} from '../../../shared/exercises/exercise-taxonomy';
import { slugRule } from '../../../shared/forms/slug';
import {
  Translatable,
  fromTranslatable,
  toOptionalTranslatable,
  toTranslatable,
  translatable,
} from '../../../shared/i18n/translatable';

/** Mirrors CreateGlobalExerciseDto; the API validates again. */
export const GLOBAL_EXERCISE_LIMITS = {
  slug: 80,
  name: 80,
  description: 2000,
  instructions: 4000,
  secondaryMuscles: 6,
  tags: 10,
} as const;

export interface AdminExerciseFormModel {
  slug: string;
  name: Translatable;
  description: Translatable;
  instructions: Translatable;
  primaryMuscle: Muscle | null;
  secondaryMuscles: Muscle[];
  equipment: Equipment | null;
  mechanic: Mechanic | null;
  category: Category;
  /** Tag slugs. */
  tags: string[];
  hypertrophy: Tier | null;
  powerlifting: Tier | null;
}

export function toAdminExerciseForm(exercise: AdminExerciseDto | null): AdminExerciseFormModel {
  return {
    slug: exercise?.slug ?? '',
    name: fromTranslatable(exercise?.name),
    description: fromTranslatable(exercise?.description),
    instructions: fromTranslatable(exercise?.instructions),
    primaryMuscle: exercise?.primaryMuscle ?? null,
    secondaryMuscles: [...(exercise?.secondaryMuscles ?? [])],
    equipment: exercise?.equipment ?? null,
    mechanic: exercise?.mechanic ?? null,
    category: exercise?.category ?? 'strength',
    tags: [...(exercise?.tags ?? [])],
    hypertrophy: exercise?.tiers.hypertrophy ?? null,
    powerlifting: exercise?.tiers.powerlifting ?? null,
  };
}

export const adminExerciseSchema = (isNew: () => boolean) =>
  schema<AdminExerciseFormModel>((path) => {
    slugRule(path.slug, GLOBAL_EXERCISE_LIMITS.slug, isNew);
    translatable(path.name, { required: true, maxLength: GLOBAL_EXERCISE_LIMITS.name });
    translatable(path.description, { maxLength: GLOBAL_EXERCISE_LIMITS.description });
    translatable(path.instructions, { maxLength: GLOBAL_EXERCISE_LIMITS.instructions });
    required(path.primaryMuscle);
    required(path.equipment);
    required(path.mechanic);
    validate(path.secondaryMuscles, ({ value }) =>
      value().length > GLOBAL_EXERCISE_LIMITS.secondaryMuscles
        ? { kind: 'maxItems', max: GLOBAL_EXERCISE_LIMITS.secondaryMuscles }
        : undefined,
    );
    validate(path.tags, ({ value }) =>
      value().length > GLOBAL_EXERCISE_LIMITS.tags
        ? { kind: 'maxItems', max: GLOBAL_EXERCISE_LIMITS.tags }
        : undefined,
    );
  });

const secondaryWithout = (model: AdminExerciseFormModel) =>
  model.secondaryMuscles.filter((m) => m !== model.primaryMuscle);

/** Call only on a valid form. */
export function toCreateGlobalExerciseDto(
  model: AdminExerciseFormModel,
  imageUrl: string | null,
): CreateGlobalExerciseDto {
  const description = toOptionalTranslatable(model.description);
  const instructions = toOptionalTranslatable(model.instructions);
  return {
    slug: model.slug,
    name: toTranslatable(model.name),
    ...(description && { description }),
    ...(instructions && { instructions }),
    primaryMuscle: model.primaryMuscle!,
    secondaryMuscles: secondaryWithout(model),
    equipment: model.equipment!,
    mechanic: model.mechanic!,
    category: model.category,
    tags: model.tags,
    tiers: { hypertrophy: model.hypertrophy, powerlifting: model.powerlifting },
    ...(imageUrl && { imageUrl }),
  };
}

export function toUpdateGlobalExerciseDto(
  model: AdminExerciseFormModel,
  imageUrl: string | null,
): UpdateGlobalExerciseDto {
  const description = toOptionalTranslatable(model.description);
  const instructions = toOptionalTranslatable(model.instructions);
  return {
    name: toTranslatable(model.name),
    ...(description && { description }),
    ...(instructions && { instructions }),
    primaryMuscle: model.primaryMuscle!,
    secondaryMuscles: secondaryWithout(model),
    equipment: model.equipment!,
    mechanic: model.mechanic!,
    category: model.category,
    tags: model.tags,
    tiers: { hypertrophy: model.hypertrophy, powerlifting: model.powerlifting },
    imageUrl,
  };
}
