import { CreateProgramDto } from '../../api/models/create-program-dto';
import { ProgramDto } from '../../api/models/program-dto';
import { UnitSystem, kgToLb, lbToKg } from '../../shared/units/units';

/** Mirrors CreateProgramDto limits in openapi.json. */
export const PROGRAM_LIMITS = {
  name: 80,
  notes: 2000,
  weeksMin: 1,
  weeksMax: 52,
  deloadMin: 5,
  deloadMax: 90,
  trainingMaxKgMin: 1,
  trainingMaxKgMax: 1000,
} as const;

export const DEFAULT_WEEKS = 4;
/** The API's own default when no deload is sent. */
export const DEFAULT_DELOAD_PERCENT = 40;

export type DeloadMode = 'weight' | 'sets';

export interface DraftTrainingMax {
  exerciseId: string;
  /** User's unit. */
  value: number | null;
}

export interface ProgramDraft {
  name: string;
  notes: string;
  durationWeeks: number;
  /** grid[week][isoWeekday - 1] = routineId, or null for a rest day. */
  grid: (string | null)[][];
  /** Day labels from the API, kept as they were (not edited here). */
  labels: (string | null)[][];
  deloadMode: DeloadMode;
  deloadPercent: number | null;
  /** 1-based week numbers. */
  deloadWeeks: number[];
  trainingMaxes: DraftTrainingMax[];
}

const emptyWeek = (): (string | null)[] => Array<string | null>(7).fill(null);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function emptyProgram(weeks = DEFAULT_WEEKS): ProgramDraft {
  return {
    name: '',
    notes: '',
    durationWeeks: weeks,
    grid: Array.from({ length: weeks }, emptyWeek),
    labels: Array.from({ length: weeks }, emptyWeek),
    deloadMode: 'weight',
    deloadPercent: DEFAULT_DELOAD_PERCENT,
    deloadWeeks: [],
    trainingMaxes: [],
  };
}

export function fromProgramDto(dto: ProgramDto, units: UnitSystem): ProgramDraft {
  const grid = dto.weeks.map((week) => {
    const row = emptyWeek();
    for (const day of week.days) row[day.weekday - 1] = day.routineId;
    return row;
  });
  const labels = dto.weeks.map((week) => {
    const row = emptyWeek();
    for (const day of week.days) row[day.weekday - 1] = day.label;
    return row;
  });
  return {
    name: dto.name,
    notes: dto.notes,
    durationWeeks: dto.durationWeeks,
    grid,
    labels,
    deloadMode: dto.deload.mode,
    deloadPercent: dto.deload.percent,
    deloadWeeks: [...dto.deload.weeks].sort((a, b) => a - b),
    trainingMaxes: dto.trainingMaxes.map((tm) => ({
      exerciseId: tm.exerciseId,
      value: round2(units === 'imperial' ? kgToLb(tm.kg) : tm.kg),
    })),
  };
}

/** Call only on a valid draft. Same body for create and update. */
export function toProgramDto(draft: ProgramDraft, units: UnitSystem): CreateProgramDto {
  return {
    name: draft.name.trim(),
    notes: draft.notes.trim(),
    durationWeeks: draft.durationWeeks,
    weeks: draft.grid.map((row, w) => ({
      days: row.flatMap((routineId, i) =>
        routineId
          ? [
              {
                weekday: i + 1,
                routineId,
                ...(draft.labels[w]?.[i] && { label: draft.labels[w][i] }),
              },
            ]
          : [],
      ),
    })),
    deload: {
      mode: draft.deloadMode,
      percent: draft.deloadPercent ?? DEFAULT_DELOAD_PERCENT,
      weeks: draft.deloadWeeks.filter((w) => w <= draft.durationWeeks),
    },
    trainingMaxes: draft.trainingMaxes
      .filter((tm) => tm.value !== null && tm.value > 0)
      .map((tm) => ({
        exerciseId: tm.exerciseId,
        kg: round2(units === 'imperial' ? lbToKg(tm.value!) : tm.value!),
      })),
  };
}

// ---------- editing (all pure) ----------

/**
 * Change the length. New weeks repeat the last week's schedule (the common case: same
 * split every week); removed weeks also drop their deload marks.
 */
export function resizeWeeks(draft: ProgramDraft, weeks: number): ProgramDraft {
  const n = Math.max(PROGRAM_LIMITS.weeksMin, Math.min(PROGRAM_LIMITS.weeksMax, Math.trunc(weeks)));
  if (!Number.isFinite(n) || n === draft.durationWeeks) return draft;
  const last = draft.grid.at(-1) ?? emptyWeek();
  const grid = Array.from({ length: n }, (_, w) => [...(draft.grid[w] ?? last)]);
  const labels = Array.from({ length: n }, (_, w) => [...(draft.labels[w] ?? emptyWeek())]);
  return {
    ...draft,
    durationWeeks: n,
    grid,
    labels,
    deloadWeeks: draft.deloadWeeks.filter((w) => w <= n),
  };
}

export function setCell(
  draft: ProgramDraft,
  week: number,
  weekday: number,
  routineId: string | null,
): ProgramDraft {
  const grid = draft.grid.map((row, w) =>
    w === week ? row.map((cell, d) => (d === weekday - 1 ? routineId : cell)) : row,
  );
  return { ...draft, grid };
}

export function copyWeekToAll(draft: ProgramDraft, week: number): ProgramDraft {
  const source = draft.grid[week];
  if (!source) return draft;
  return { ...draft, grid: draft.grid.map(() => [...source]) };
}

export function toggleDeloadWeek(draft: ProgramDraft, week: number): ProgramDraft {
  const weeks = draft.deloadWeeks.includes(week)
    ? draft.deloadWeeks.filter((w) => w !== week)
    : [...draft.deloadWeeks, week].sort((a, b) => a - b);
  return { ...draft, deloadWeeks: weeks };
}

/** Distinct routines scheduled anywhere, in first-appearance order. */
export function scheduledRoutineIds(draft: ProgramDraft): string[] {
  return [...new Set(draft.grid.flat().filter((id): id is string => !!id))];
}

export const trainingDayCount = (draft: ProgramDraft): number =>
  draft.grid.flat().filter(Boolean).length;

/**
 * One row per exercise that needs a max (keeping what was typed); maxes already entered
 * for other exercises are kept too. Returns the SAME draft when nothing changes, so it is
 * safe to call from an effect that also reads the draft.
 */
export function syncTrainingMaxes(draft: ProgramDraft, exerciseIds: string[]): ProgramDraft {
  const byId = new Map(draft.trainingMaxes.map((tm) => [tm.exerciseId, tm]));
  const needed = exerciseIds.map((id) => byId.get(id) ?? { exerciseId: id, value: null });
  const kept = draft.trainingMaxes.filter(
    (tm) => !exerciseIds.includes(tm.exerciseId) && tm.value !== null,
  );
  const trainingMaxes = [...needed, ...kept];
  const same =
    trainingMaxes.length === draft.trainingMaxes.length &&
    trainingMaxes.every((tm, i) => tm === draft.trainingMaxes[i]);
  return same ? draft : { ...draft, trainingMaxes };
}
