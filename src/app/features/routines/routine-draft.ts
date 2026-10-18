import { DeloadConfigDto } from '../../api/models/deload-config-dto';
import { DoubleProgressionRuleDto } from '../../api/models/double-progression-rule-dto';
import { PercentOf1RmRuleDto } from '../../api/models/percent-of-1-rm-rule-dto';
import { RoutineDetailDto } from '../../api/models/routine-detail-dto';
import { RoutineExerciseDto } from '../../api/models/routine-exercise-dto';
import { RoutineExerciseInfoDto } from '../../api/models/routine-exercise-info-dto';
import { TargetSetDto } from '../../api/models/target-set-dto';
import { UnitSystem, kgToLb, lbToKg } from '../../shared/units/units';

/** Mirrors CreateRoutineDto / RoutineExerciseDto / TargetSetDto limits in openapi.json. */
export const ROUTINE_LIMITS = {
  name: 80,
  notes: 2000,
  itemNotes: 1000,
  exercises: 30,
  sets: 20,
  reps: 100,
  weightKg: 1000,
  percentMin: 10,
  percentMax: 110,
  restSeconds: 1800,
} as const;

export const DEFAULT_REST_SECONDS = 90;

export type SetType = TargetSetDto['type'];
export const SET_TYPES: readonly SetType[] = ['warmup', 'normal', 'dropset', 'failure'];

/** How a target set's load is expressed. Weight is edited in the user's unit. */
export type LoadMode = 'none' | 'weight' | 'percent';

export interface DraftSet {
  type: SetType;
  repsMin: number | null;
  repsMax: number | null;
  loadMode: LoadMode;
  /** Weight in the user's unit (kg/lb) or %1RM, per `loadMode`. */
  load: number | null;
  restSeconds: number | null;
}

export type ProgressionKind = 'none' | 'double_progression' | 'percent_1rm';

export interface DraftWeekPercent {
  percent: number | null;
  reps: number | null;
  sets: number | null;
}

export interface DraftProgression {
  kind: ProgressionKind;
  /** User's unit; null = API default (2.5 kg compound / 1 kg isolation). */
  increment: number | null;
  rounding: number | null;
  weeks: DraftWeekPercent[];
  /** Per-exercise deload override: kept as-is (not edited here). */
  deload: DeloadConfigDto | null;
}

export type ProgressionRule = DoubleProgressionRuleDto | PercentOf1RmRuleDto;

export interface DraftItem {
  /** Slot id: stable across edits (workouts reference it). */
  id: string;
  exerciseId: string;
  exercise: RoutineExerciseInfoDto | null;
  /** Same groupId = superset; members are always contiguous (see normalizeGroups). */
  groupId: string | null;
  notes: string;
  sets: DraftSet[];
  progression: DraftProgression;
  /** The rule as stored, re-sent verbatim when untouched (see toRoutineDto). */
  storedProgression: ProgressionRule | null;
}

export interface RoutineDraft {
  name: string;
  notes: string;
  items: DraftItem[];
}

// ---------- conversions ----------

const round2 = (n: number) => Math.round(n * 100) / 100;
const toDisplay = (kg: number, units: UnitSystem) => round2(units === 'imperial' ? kgToLb(kg) : kg);
const toKg = (value: number, units: UnitSystem) =>
  round2(units === 'imperial' ? lbToKg(value) : value);
const kgOrNull = (value: number | null | undefined, units: UnitSystem) =>
  value === null || value === undefined ? null : toDisplay(value, units);

export const emptyRoutine = (): RoutineDraft => ({ name: '', notes: '', items: [] });

export const noProgression = (): DraftProgression => ({
  kind: 'none',
  increment: null,
  rounding: null,
  weeks: [],
  deload: null,
});

export function defaultSet(restSeconds = DEFAULT_REST_SECONDS): DraftSet {
  return { type: 'normal', repsMin: 8, repsMax: 12, loadMode: 'none', load: null, restSeconds };
}

export function newItem(
  exercise: { id: string } & RoutineExerciseInfoDto,
  restSeconds = DEFAULT_REST_SECONDS,
): DraftItem {
  const { id, ...info } = exercise;
  return {
    id: crypto.randomUUID(),
    exerciseId: id,
    exercise: info,
    groupId: null,
    notes: '',
    sets: [defaultSet(restSeconds), defaultSet(restSeconds), defaultSet(restSeconds)],
    progression: noProgression(),
    storedProgression: null,
  };
}

export function progressionFromDto(
  rule: ProgressionRule | null,
  units: UnitSystem,
): DraftProgression {
  if (!rule) return noProgression();
  if (rule.type === 'double_progression') {
    return {
      kind: 'double_progression',
      increment: kgOrNull(rule.incrementKg, units),
      rounding: kgOrNull(rule.roundingKg, units),
      weeks: [],
      deload: rule.deload ?? null,
    };
  }
  return {
    kind: 'percent_1rm',
    increment: null,
    rounding: kgOrNull(rule.roundingKg, units),
    weeks: rule.weeks.map((w) => ({
      percent: w.percent,
      reps: w.reps ?? null,
      sets: w.sets ?? null,
    })),
    deload: rule.deload ?? null,
  };
}

export function progressionToDto(p: DraftProgression, units: UnitSystem): ProgressionRule | null {
  const kg = (value: number | null) => (value === null ? undefined : toKg(value, units));
  const deload = p.deload ? { deload: p.deload } : {};
  switch (p.kind) {
    case 'none':
      return null;
    case 'double_progression': {
      const incrementKg = kg(p.increment);
      const roundingKg = kg(p.rounding);
      return {
        type: 'double_progression',
        ...(incrementKg !== undefined && { incrementKg }),
        ...(roundingKg !== undefined && { roundingKg }),
        ...deload,
      };
    }
    case 'percent_1rm': {
      const roundingKg = kg(p.rounding);
      return {
        type: 'percent_1rm',
        weeks: p.weeks.map((w) => ({
          percent: w.percent ?? 0,
          ...(w.reps !== null && { reps: w.reps }),
          ...(w.sets !== null && { sets: w.sets }),
        })),
        ...(roundingKg !== undefined && { roundingKg }),
        ...deload,
      };
    }
  }
}

export function fromRoutineDetail(dto: RoutineDetailDto, units: UnitSystem): RoutineDraft {
  return {
    name: dto.name,
    notes: dto.notes,
    items: dto.exercises.map((e) => {
      const stored = (e.progression ?? null) as ProgressionRule | null;
      return {
        id: e.id,
        exerciseId: e.exerciseId,
        exercise: e.exercise,
        groupId: e.groupId,
        notes: e.notes,
        sets: e.sets.map((s) => ({
          type: s.type,
          repsMin: s.repsMin,
          repsMax: s.repsMax,
          loadMode: s.percent1RM !== null ? 'percent' : s.weightKg !== null ? 'weight' : 'none',
          load:
            s.percent1RM !== null
              ? s.percent1RM
              : s.weightKg !== null
                ? toDisplay(s.weightKg, units)
                : null,
          restSeconds: s.restSeconds,
        })),
        progression: progressionFromDto(stored, units),
        storedProgression: stored,
      };
    }),
  };
}

function setToDto(set: DraftSet, units: UnitSystem): TargetSetDto {
  const hasLoad = set.load !== null && !Number.isNaN(set.load);
  return {
    type: set.type,
    repsMin: set.repsMin ?? 1,
    repsMax: set.repsMax ?? set.repsMin ?? 1,
    weightKg: set.loadMode === 'weight' && hasLoad ? toKg(set.load!, units) : null,
    percent1RM: set.loadMode === 'percent' && hasLoad ? set.load : null,
    restSeconds: set.restSeconds ?? 0,
  };
}

/**
 * Untouched rules go back exactly as stored: the API only requires Premium when a rule
 * CHANGES (it compares JSON), so a user who downgraded can still edit the routine.
 */
function itemProgression(item: DraftItem, units: UnitSystem): ProgressionRule | null {
  const untouched =
    JSON.stringify(progressionFromDto(item.storedProgression, units)) ===
    JSON.stringify(item.progression);
  return untouched ? item.storedProgression : progressionToDto(item.progression, units);
}

/** Call only on a valid draft. Body for both POST and PATCH (exercises replace the list). */
export function toRoutineDto(
  draft: RoutineDraft,
  units: UnitSystem,
): { name: string; notes: string; exercises: RoutineExerciseDto[] } {
  return {
    name: draft.name.trim(),
    notes: draft.notes.trim(),
    exercises: normalizeGroups(draft.items).map((item) => ({
      id: item.id,
      exerciseId: item.exerciseId,
      groupId: item.groupId,
      notes: item.notes.trim(),
      sets: item.sets.map((s) => setToDto(s, units)),
      progression: itemProgression(item, units),
    })),
  };
}

/** Exercises whose targets are a % of a max (a %1RM rule or %1RM sets). */
export function referenceMaxNeedsOf(draft: RoutineDraft): { exerciseId: string; name: string }[] {
  return draft.items
    .filter(
      (i) => i.progression.kind === 'percent_1rm' || i.sets.some((s) => s.loadMode === 'percent'),
    )
    .map((i) => ({ exerciseId: i.exerciseId, name: i.exercise?.name ?? '' }));
}

// ---------- editing (all pure) ----------

/**
 * Supersets must be contiguous runs of 2+. After any move/removal: a group split apart
 * keeps only its first run, and a group of one is dissolved.
 */
export function normalizeGroups(items: DraftItem[]): DraftItem[] {
  const seen = new Set<string>();
  const result = items.map((item) => ({ ...item }));
  for (let i = 0; i < result.length; i++) {
    const group = result[i].groupId;
    if (!group) continue;
    const startsRun = i === 0 || result[i - 1].groupId !== group;
    if (startsRun && seen.has(group))
      result[i].groupId = null; // a later, detached run
    else seen.add(group);
  }
  for (let i = 0; i < result.length; i++) {
    const group = result[i].groupId;
    if (!group) continue;
    const prev = result[i - 1]?.groupId === group;
    const next = result[i + 1]?.groupId === group;
    if (!prev && !next) result[i].groupId = null;
  }
  return result;
}

export function moveItem(draft: RoutineDraft, from: number, to: number): RoutineDraft {
  if (from === to || from < 0 || from >= draft.items.length) return draft;
  const items = [...draft.items];
  const [moved] = items.splice(from, 1);
  items.splice(Math.max(0, Math.min(to, items.length)), 0, moved);
  return { ...draft, items: normalizeGroups(items) };
}

export function addItem(draft: RoutineDraft, item: DraftItem): RoutineDraft {
  return { ...draft, items: [...draft.items, item] };
}

export function removeItem(draft: RoutineDraft, index: number): RoutineDraft {
  return { ...draft, items: normalizeGroups(draft.items.filter((_, i) => i !== index)) };
}

/** Is item `index` in the same superset as the next one? */
export const linkedWithNext = (items: DraftItem[], index: number): boolean =>
  !!items[index]?.groupId && items[index].groupId === items[index + 1]?.groupId;

/**
 * Link item `index` with the next one into a superset (joining an existing group), or,
 * if they are already linked, split the group between them.
 */
export function toggleLinkWithNext(draft: RoutineDraft, index: number): RoutineDraft {
  const items = draft.items.map((item) => ({ ...item }));
  const a = items[index];
  const b = items[index + 1];
  if (!a || !b) return draft;

  if (linkedWithNext(items, index)) {
    const tail = crypto.randomUUID().slice(0, 8);
    for (let i = index + 1; i < items.length && items[i].groupId === a.groupId; i++) {
      items[i].groupId = `g${tail}`;
    }
  } else {
    // Groups are contiguous and b's (if any) starts right after a: merging stays contiguous.
    const group = a.groupId ?? `g${crypto.randomUUID().slice(0, 8)}`;
    const bGroup = b.groupId;
    for (const item of items) if (bGroup && item.groupId === bGroup) item.groupId = group;
    a.groupId = group;
    b.groupId = group;
  }
  return { ...draft, items: normalizeGroups(items) };
}

export function addSet(draft: RoutineDraft, itemIndex: number, defaultRest?: number): RoutineDraft {
  return updateItem(draft, itemIndex, (item) => {
    const last = item.sets.at(-1);
    return { ...item, sets: [...item.sets, last ? { ...last } : defaultSet(defaultRest)] };
  });
}

export function removeSet(draft: RoutineDraft, itemIndex: number, setIndex: number): RoutineDraft {
  return updateItem(draft, itemIndex, (item) =>
    item.sets.length <= 1 ? item : { ...item, sets: item.sets.filter((_, i) => i !== setIndex) },
  );
}

/** %1RM rules: a new week copies the last one, 5 points heavier (70% for the first). */
export function addProgressionWeek(draft: RoutineDraft, itemIndex: number): RoutineDraft {
  return updateItem(draft, itemIndex, (item) => {
    const last = item.progression.weeks.at(-1);
    const percent = last?.percent ? Math.min(last.percent + 5, 110) : 70;
    const week = { percent, reps: last?.reps ?? null, sets: last?.sets ?? null };
    return {
      ...item,
      progression: { ...item.progression, weeks: [...item.progression.weeks, week] },
    };
  });
}

export function removeProgressionWeek(
  draft: RoutineDraft,
  itemIndex: number,
  weekIndex: number,
): RoutineDraft {
  return updateItem(draft, itemIndex, (item) => ({
    ...item,
    progression: {
      ...item.progression,
      weeks: item.progression.weeks.filter((_, i) => i !== weekIndex),
    },
  }));
}

export function updateItem(
  draft: RoutineDraft,
  index: number,
  update: (item: DraftItem) => DraftItem,
): RoutineDraft {
  return { ...draft, items: draft.items.map((item, i) => (i === index ? update(item) : item)) };
}
