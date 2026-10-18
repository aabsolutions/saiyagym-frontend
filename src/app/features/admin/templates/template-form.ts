import { AdminProgramTemplateDto } from '../../../api/models/admin-program-template-dto';
import { CreateProgramTemplateDto } from '../../../api/models/create-program-template-dto';
import { ProgramDeloadDto } from '../../../api/models/program-deload-dto';
import { TargetSetDto } from '../../../api/models/target-set-dto';
import { TemplateExerciseDto } from '../../../api/models/template-exercise-dto';
import { UpdateProgramTemplateDto } from '../../../api/models/update-program-template-dto';
import { slugError } from '../../../shared/forms/slug';
import {
  Translatable,
  fromTranslatable,
  missingLanguages,
  toOptionalTranslatable,
  toTranslatable,
} from '../../../shared/i18n/translatable';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/languages';

export type TemplateGoal = AdminProgramTemplateDto['goal'];
export type TemplateLevel = AdminProgramTemplateDto['level'];
export type SetType = TargetSetDto['type'];

export const TEMPLATE_GOALS: readonly TemplateGoal[] = ['hypertrophy', 'powerlifting', 'both'];
export const TEMPLATE_LEVELS: readonly TemplateLevel[] = ['beginner', 'intermediate', 'advanced'];
export const SET_TYPES: readonly SetType[] = ['warmup', 'normal', 'dropset', 'failure'];

/** Mirrors CreateProgramTemplateDto / TemplateRoutineDto; the API validates again. */
export const TEMPLATE_LIMITS = {
  slug: 80,
  name: 80,
  description: 2000,
  routineKey: 40,
  routines: 7,
  exercises: 30,
  sets: 20,
  weeks: { min: 1, max: 52 },
} as const;

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface TemplateExerciseModel {
  exerciseSlug: string;
  /** Display only. */
  exerciseName: string;
  notes: string;
  groupId: string | null;
  sets: TargetSetDto[];
  /** Kept untouched: progression rules are edited in the user's routine builder, not here. */
  progression: TemplateExerciseDto['progression'];
}

export interface TemplateRoutineModel {
  key: string;
  name: Translatable;
  exercises: TemplateExerciseModel[];
}

export interface TemplateFormModel {
  slug: string;
  name: Translatable;
  description: Translatable;
  goal: TemplateGoal;
  level: TemplateLevel;
  durationWeeks: number;
  sortOrder: number;
  active: boolean;
  routines: TemplateRoutineModel[];
  /** `weeks[w][weekday - 1]` = routine key, or null for rest. Always `durationWeeks` long. */
  weeks: (string | null)[][];
  deload: ProgramDeloadDto;
}

export const emptyWeek = (): (string | null)[] => Array(7).fill(null);

export const newSet = (): TargetSetDto => ({
  type: 'normal',
  repsMin: 8,
  repsMax: 12,
  restSeconds: 90,
});

export function toTemplateForm(
  t: AdminProgramTemplateDto | null,
  exerciseName: (slug: string) => string,
): TemplateFormModel {
  return {
    slug: t?.slug ?? '',
    name: fromTranslatable(t?.name),
    description: fromTranslatable(t?.description),
    goal: t?.goal ?? 'hypertrophy',
    level: t?.level ?? 'beginner',
    durationWeeks: t?.durationWeeks ?? 4,
    sortOrder: t?.sortOrder ?? 0,
    active: t?.active ?? true,
    routines: (t?.routines ?? []).map((r) => ({
      key: r.key,
      name: fromTranslatable(r.name),
      exercises: r.exercises.map((e) => ({
        exerciseSlug: e.exerciseSlug,
        exerciseName: exerciseName(e.exerciseSlug),
        notes: e.notes ?? '',
        groupId: e.groupId ?? null,
        sets: e.sets.map((s) => ({ ...s })),
        progression: e.progression ?? null,
      })),
    })),
    weeks: t
      ? t.weeks.map((w) => {
          const week = emptyWeek();
          for (const day of w.days) week[day.weekday - 1] = day.routineKey;
          return week;
        })
      : Array.from({ length: 4 }, emptyWeek),
    deload: t?.deload
      ? { ...t.deload, weeks: [...t.deload.weeks] }
      : { mode: 'weight', percent: 40, weeks: [] },
  };
}

// ---------- Immutable edits ----------

/** New weeks repeat the last one (the usual case: the same split every week). */
export function resizeWeeks(model: TemplateFormModel, durationWeeks: number): TemplateFormModel {
  const n = Math.min(TEMPLATE_LIMITS.weeks.max, Math.max(TEMPLATE_LIMITS.weeks.min, durationWeeks));
  const last = model.weeks.at(-1) ?? emptyWeek();
  const weeks = Array.from({ length: n }, (_, i) => [...(model.weeks[i] ?? last)]);
  return {
    ...model,
    durationWeeks: n,
    weeks,
    deload: { ...model.deload, weeks: model.deload.weeks.filter((w) => w <= n) },
  };
}

export const copyFirstWeek = (model: TemplateFormModel): TemplateFormModel => ({
  ...model,
  weeks: model.weeks.map(() => [...(model.weeks[0] ?? emptyWeek())]),
});

export function setDay(
  model: TemplateFormModel,
  week: number,
  weekday: number,
  key: string | null,
): TemplateFormModel {
  return {
    ...model,
    weeks: model.weeks.map((days, w) =>
      w === week ? days.map((k, d) => (d === weekday - 1 ? key : k)) : days,
    ),
  };
}

/** A unique key for a new routine: r1, r2… */
export function nextRoutineKey(model: TemplateFormModel): string {
  const keys = new Set(model.routines.map((r) => r.key));
  let i = model.routines.length + 1;
  while (keys.has(`r${i}`)) i++;
  return `r${i}`;
}

export const addRoutine = (model: TemplateFormModel): TemplateFormModel => ({
  ...model,
  routines: [
    ...model.routines,
    { key: nextRoutineKey(model), name: fromTranslatable(null), exercises: [] },
  ],
});

/** Removing a routine also frees the days it was scheduled on. */
export function removeRoutine(model: TemplateFormModel, index: number): TemplateFormModel {
  const key = model.routines[index]?.key;
  return {
    ...model,
    routines: model.routines.filter((_, i) => i !== index),
    weeks: model.weeks.map((days) => days.map((k) => (k === key ? null : k))),
  };
}

/** Renaming a key renames it in the schedule too. */
export function renameRoutineKey(
  model: TemplateFormModel,
  index: number,
  key: string,
): TemplateFormModel {
  const old = model.routines[index]?.key;
  return {
    ...model,
    routines: model.routines.map((r, i) => (i === index ? { ...r, key } : r)),
    weeks: model.weeks.map((days) => days.map((k) => (k === old ? key : k))),
  };
}

export function updateRoutine(
  model: TemplateFormModel,
  index: number,
  update: (routine: TemplateRoutineModel) => TemplateRoutineModel,
): TemplateFormModel {
  return { ...model, routines: model.routines.map((r, i) => (i === index ? update(r) : r)) };
}

export function updateExercise(
  routine: TemplateRoutineModel,
  index: number,
  update: (exercise: TemplateExerciseModel) => TemplateExerciseModel,
): TemplateRoutineModel {
  return { ...routine, exercises: routine.exercises.map((e, i) => (i === index ? update(e) : e)) };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// ---------- Checks (what the API would reject) ----------

export type TemplateProblem =
  | { kind: 'slug' }
  | { kind: 'name' }
  | { kind: 'noRoutines' }
  | { kind: 'routineKey'; routine: number }
  | { kind: 'duplicateKey'; key: string }
  | { kind: 'routineName'; routine: number }
  | { kind: 'noExercises'; routine: number }
  | { kind: 'noSets'; routine: number; exercise: number }
  | { kind: 'reps'; routine: number; exercise: number }
  | { kind: 'notScheduled' };

export function templateProblems(model: TemplateFormModel, isNew: boolean): TemplateProblem[] {
  const problems: TemplateProblem[] = [];
  if (isNew && slugError(model.slug, TEMPLATE_LIMITS.slug)) problems.push({ kind: 'slug' });
  if (missingLanguages(model.name).includes(DEFAULT_LANGUAGE)) problems.push({ kind: 'name' });
  if (!model.routines.length) problems.push({ kind: 'noRoutines' });
  const seen = new Set<string>();
  model.routines.forEach((r, i) => {
    if (!KEY_PATTERN.test(r.key) || r.key.length > TEMPLATE_LIMITS.routineKey) {
      problems.push({ kind: 'routineKey', routine: i });
    } else if (seen.has(r.key)) {
      problems.push({ kind: 'duplicateKey', key: r.key });
    }
    seen.add(r.key);
    if (missingLanguages(r.name).includes(DEFAULT_LANGUAGE)) {
      problems.push({ kind: 'routineName', routine: i });
    }
    if (!r.exercises.length) problems.push({ kind: 'noExercises', routine: i });
    r.exercises.forEach((e, j) => {
      if (!e.sets.length) problems.push({ kind: 'noSets', routine: i, exercise: j });
      if (e.sets.some((s) => !(s.repsMin >= 1 && s.repsMax >= s.repsMin))) {
        problems.push({ kind: 'reps', routine: i, exercise: j });
      }
    });
  });
  if (model.routines.length && !model.weeks.some((days) => days.some((k) => k !== null))) {
    problems.push({ kind: 'notScheduled' });
  }
  return problems;
}

// ---------- DTOs ----------

function content(model: TemplateFormModel) {
  const description = toOptionalTranslatable(model.description);
  return {
    name: toTranslatable(model.name),
    ...(description && { description }),
    goal: model.goal,
    level: model.level,
    durationWeeks: model.durationWeeks,
    sortOrder: model.sortOrder,
    active: model.active,
    deload: { ...model.deload, weeks: [...model.deload.weeks].sort((a, b) => a - b) },
    routines: model.routines.map((r) => ({
      key: r.key,
      name: toTranslatable(r.name),
      exercises: r.exercises.map((e) => ({
        exerciseSlug: e.exerciseSlug,
        sets: e.sets,
        ...(e.notes.trim() && { notes: e.notes.trim() }),
        ...(e.groupId && { groupId: e.groupId }),
        ...(e.progression && { progression: e.progression }),
      })),
    })),
    weeks: model.weeks.map((days) => ({
      days: days.flatMap((key, d) => (key ? [{ weekday: d + 1, routineKey: key }] : [])),
    })),
  };
}

export const toCreateTemplateDto = (model: TemplateFormModel): CreateProgramTemplateDto => ({
  slug: model.slug,
  ...content(model),
});

export const toUpdateTemplateDto = (model: TemplateFormModel): UpdateProgramTemplateDto =>
  content(model);
