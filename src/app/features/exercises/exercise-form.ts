import { maxLength, required, schema, validate } from '@angular/forms/signals';
import { CreateCustomExerciseDto } from '../../api/models/create-custom-exercise-dto';
import { ExerciseDetailDto } from '../../api/models/exercise-detail-dto';
import { UpdateCustomExerciseDto } from '../../api/models/update-custom-exercise-dto';
import { Category, Equipment, Mechanic, Muscle } from '../../shared/exercises/exercise-taxonomy';

/** Mirrors CreateCustomExerciseDto constraints in openapi.json; the API validates again. */
export const EXERCISE_LIMITS = {
  name: 80,
  description: 2000,
  instructions: 4000,
  secondaryMuscles: 6,
  tags: 10,
} as const;

export interface ExerciseFormModel {
  name: string;
  primaryMuscle: Muscle | null;
  secondaryMuscles: Muscle[];
  equipment: Equipment | null;
  mechanic: Mechanic | null;
  category: Category | null;
  tags: string[];
  description: string;
  instructions: string;
}

export const emptyExerciseForm = (): ExerciseFormModel => ({
  name: '',
  primaryMuscle: null,
  secondaryMuscles: [],
  equipment: null,
  mechanic: null,
  category: null,
  tags: [],
  description: '',
  instructions: '',
});

export function toExerciseForm(exercise: ExerciseDetailDto): ExerciseFormModel {
  return {
    name: exercise.name,
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: exercise.equipment,
    mechanic: exercise.mechanic,
    category: exercise.category,
    tags: [...exercise.tags],
    description: exercise.description,
    instructions: exercise.instructions,
  };
}

/** The secondary list never repeats the primary muscle. */
const secondaryWithout = (model: ExerciseFormModel) =>
  model.secondaryMuscles.filter((m) => m !== model.primaryMuscle);

/** Call only on a valid form (required fields set). */
export function toCreateDto(
  model: ExerciseFormModel,
  imageUrl: string | null,
): CreateCustomExerciseDto {
  const description = model.description.trim();
  const instructions = model.instructions.trim();
  return {
    name: model.name.trim(),
    primaryMuscle: model.primaryMuscle!,
    equipment: model.equipment!,
    mechanic: model.mechanic!,
    ...(model.category && { category: model.category }),
    secondaryMuscles: secondaryWithout(model),
    tags: model.tags,
    ...(description && { description }),
    ...(instructions && { instructions }),
    ...(imageUrl && { imageUrl }),
  };
}

/** PATCH: cleared texts and image are sent as null so the API removes them. */
export function toUpdateDto(
  model: ExerciseFormModel,
  imageUrl: string | null,
): UpdateCustomExerciseDto {
  return {
    name: model.name.trim(),
    primaryMuscle: model.primaryMuscle!,
    equipment: model.equipment!,
    mechanic: model.mechanic!,
    ...(model.category && { category: model.category }),
    secondaryMuscles: secondaryWithout(model),
    tags: model.tags,
    description: model.description.trim() || null,
    instructions: model.instructions.trim() || null,
    imageUrl,
  };
}

export const exerciseSchema = schema<ExerciseFormModel>((path) => {
  required(path.name);
  maxLength(path.name, EXERCISE_LIMITS.name);
  validate(path.name, ({ value }) =>
    value() && !value().trim() ? { kind: 'required' } : undefined,
  );
  required(path.primaryMuscle);
  required(path.equipment);
  required(path.mechanic);
  maxLength(path.secondaryMuscles, EXERCISE_LIMITS.secondaryMuscles);
  maxLength(path.tags, EXERCISE_LIMITS.tags);
  maxLength(path.description, EXERCISE_LIMITS.description);
  maxLength(path.instructions, EXERCISE_LIMITS.instructions);
});
