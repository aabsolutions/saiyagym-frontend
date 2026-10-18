import { applyEach, max, maxLength, min, schema } from '@angular/forms/signals';
import { UpdateWorkoutDto } from '../../api/models/update-workout-dto';
import { WorkoutDetailDto } from '../../api/models/workout-detail-dto';
import { SetType, volumeKg } from '../../shared/training/set-math';
import { UnitSystem, kgToLb, lbToKg } from '../../shared/units/units';

/** Mirrors UpdateWorkoutDto / WorkoutSetDto limits in openapi.json. */
export const WORKOUT_LIMITS = {
  name: 80,
  notes: 2000,
  exerciseNotes: 1000,
  weightKg: 1000,
  reps: 1000,
};

export interface DraftWorkoutSet {
  id: string;
  type: SetType;
  /** User's unit. */
  weight: number | null;
  /** The stored kg, re-sent when `weight` wasn't edited (no kg → lb → kg drift). */
  storedKg: number | null;
  reps: number | null;
  completed: boolean;
  completedAt: string | null;
}

export interface DraftWorkoutExercise {
  id: string;
  exerciseId: string;
  name: string | null;
  routineExerciseId: string | null;
  groupId: string | null;
  notes: string;
  sets: DraftWorkoutSet[];
}

/** Post-hoc corrections only: the web never starts or times a live session. */
export interface WorkoutDraft {
  name: string;
  notes: string;
  rating: number | null;
  exercises: DraftWorkoutExercise[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const toDisplay = (kg: number, units: UnitSystem) => round2(units === 'imperial' ? kgToLb(kg) : kg);

export function fromWorkoutDetail(dto: WorkoutDetailDto, units: UnitSystem): WorkoutDraft {
  return {
    name: dto.name,
    notes: dto.notes,
    rating: dto.rating,
    exercises: dto.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      name: e.name,
      routineExerciseId: e.routineExerciseId,
      groupId: e.groupId,
      notes: e.notes,
      sets: e.sets.map((s) => ({
        id: s.id,
        type: s.type,
        weight: s.weightKg === null ? null : toDisplay(s.weightKg, units),
        storedKg: s.weightKg,
        reps: s.reps,
        completed: s.completed,
        completedAt: s.completedAt,
      })),
    })),
  };
}

function setKg(set: DraftWorkoutSet, units: UnitSystem): number | null {
  if (set.weight === null || Number.isNaN(set.weight)) return null;
  if (set.storedKg !== null && toDisplay(set.storedKg, units) === set.weight) return set.storedKg;
  return round2(units === 'imperial' ? lbToKg(set.weight) : set.weight);
}

/** PATCH body: `exercises` replaces the whole list, so every id is sent back. */
export function toUpdateWorkoutDto(draft: WorkoutDraft, units: UnitSystem): UpdateWorkoutDto {
  return {
    name: draft.name.trim(),
    notes: draft.notes.trim(),
    rating: draft.rating,
    exercises: draft.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      routineExerciseId: e.routineExerciseId,
      groupId: e.groupId,
      notes: e.notes.trim(),
      sets: e.sets.map((s) => ({
        id: s.id,
        type: s.type,
        weightKg: setKg(s, units),
        reps: s.reps,
        completed: s.completed,
        completedAt: s.completedAt,
      })),
    })),
  };
}

export function removeWorkoutSet(draft: WorkoutDraft, exercise: number, set: number): WorkoutDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((e, i) =>
      i === exercise ? { ...e, sets: e.sets.filter((_, j) => j !== set) } : e,
    ),
  };
}

/** Live total while editing (same rule as the API: completed working sets). */
export function draftVolumeKg(draft: WorkoutDraft, units: UnitSystem): number {
  return draft.exercises.reduce(
    (sum, e) => sum + volumeKg(e.sets.map((s) => ({ ...s, weightKg: setKg(s, units) }))),
    0,
  );
}

const weightMax = (units: UnitSystem) =>
  Math.floor(units === 'imperial' ? kgToLb(WORKOUT_LIMITS.weightKg) : WORKOUT_LIMITS.weightKg);

export const workoutSchema = (units: () => UnitSystem) =>
  schema<WorkoutDraft>((path) => {
    maxLength(path.name, WORKOUT_LIMITS.name);
    maxLength(path.notes, WORKOUT_LIMITS.notes);
    min(path.rating, 1);
    max(path.rating, 5);
    applyEach(path.exercises, (e) => {
      maxLength(e.notes, WORKOUT_LIMITS.exerciseNotes);
      applyEach(e.sets, (s) => {
        min(s.weight, 0);
        max(s.weight, () => weightMax(units()));
        min(s.reps, 0);
        max(s.reps, WORKOUT_LIMITS.reps);
      });
    });
  });
