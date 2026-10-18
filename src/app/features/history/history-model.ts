import { Params } from '@angular/router';
import { WorkoutSummaryDto } from '../../api/models/workout-summary-dto';
import { WorkoutsControllerList$Params } from '../../api/fn/workouts/workouts-controller-list';
import { addDaysIso, fromIso, isoWeekday, todayIso } from '../../shared/format/local-dates';

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const HISTORY_PAGE_SIZE = 20;
/** The API's max page; one month of sessions fits comfortably. */
export const MONTH_LIMIT = 100;

/** Dates are the user's LOCAL calendar days (inclusive range). */
export interface HistoryFilters {
  from: string | null;
  to: string | null;
  routineId: string | null;
  exerciseId: string | null;
}

export const emptyHistoryFilters = (): HistoryFilters => ({
  from: null,
  to: null,
  routineId: null,
  exerciseId: null,
});

/** Local midnight of a `YYYY-MM-DD` as a UTC instant (the API filters on startedAt). */
export const localDayStart = (date: string): string => fromIso(date).toISOString();

/** The local calendar day a UTC timestamp falls on, for this browser's time zone. */
export const localDateOf = (iso: string): string => todayIso(new Date(iso));

export function toListParams(
  filters: HistoryFilters,
  page: number,
  limit = HISTORY_PAGE_SIZE,
): WorkoutsControllerList$Params {
  return {
    status: 'all',
    page,
    limit,
    ...(filters.from && { from: localDayStart(filters.from) }),
    // `to` is inclusive for the user, exclusive for the API: the next local midnight.
    ...(filters.to && { to: localDayStart(addDaysIso(filters.to, 1)) }),
    ...(filters.routineId && { routineId: filters.routineId }),
    ...(filters.exerciseId && { exerciseId: filters.exerciseId }),
  };
}

const pick = (value: unknown, pattern: RegExp): string | null =>
  typeof value === 'string' && pattern.test(value) ? value : null;

export function filtersFromParams(params: Params): HistoryFilters {
  return {
    from: pick(params['from'], LOCAL_DATE),
    to: pick(params['to'], LOCAL_DATE),
    routineId: pick(params['routine'], UUID),
    exerciseId: pick(params['exercise'], UUID),
  };
}

export function monthFromParams(params: Params): string {
  return pick(params['month'], MONTH) ?? todayIso().slice(0, 7);
}

export function pageFromParams(params: Params): number {
  const page = Number(params['page']);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function filtersToParams(filters: HistoryFilters, month: string, page: number): Params {
  return {
    from: filters.from,
    to: filters.to,
    routine: filters.routineId,
    exercise: filters.exerciseId,
    month: month === todayIso().slice(0, 7) ? null : month,
    page: page > 1 ? page : null,
  };
}

export const hasFilters = (f: HistoryFilters) => !!(f.from || f.to || f.routineId || f.exerciseId);

// ---------- calendar ----------

export const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** API range for a local month: [first local midnight, next month's first local midnight). */
export function monthRange(month: string): { from: string; to: string } {
  return {
    from: localDayStart(`${month}-01`),
    to: localDayStart(`${shiftMonth(month, 1)}-01`),
  };
}

/** Weeks × 7 local dates covering the month, starting on the user's first weekday. */
export function monthGrid(month: string, firstDayOfWeek: number): string[][] {
  const first = `${month}-01`;
  const lead = (isoWeekday(first) - firstDayOfWeek + 7) % 7;
  let day = addDaysIso(first, -lead);
  const weeks: string[][] = [];
  do {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDaysIso(day, 1);
    }
    weeks.push(week);
  } while (day.slice(0, 7) === month);
  return weeks;
}

export function groupByLocalDay(
  workouts: readonly WorkoutSummaryDto[],
): Map<string, WorkoutSummaryDto[]> {
  const days = new Map<string, WorkoutSummaryDto[]>();
  for (const w of workouts) {
    const day = localDateOf(w.startedAt);
    days.set(day, [...(days.get(day) ?? []), w]);
  }
  return days;
}

export const ROUTINE_COLORS = 8;

/** Stable color slot per routine (by its position in the user's routine list). */
export function routineColorIndex(
  routineId: string | null,
  routineOrder: readonly string[],
): number | null {
  if (!routineId) return null;
  const index = routineOrder.indexOf(routineId);
  return index < 0 ? null : index % ROUTINE_COLORS;
}
