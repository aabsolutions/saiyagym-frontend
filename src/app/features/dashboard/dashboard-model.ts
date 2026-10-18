import { RecordEntryDto } from '../../api/models/record-entry-dto';
import { RecordsSummaryItemDto } from '../../api/models/records-summary-item-dto';
import { TodayDto } from '../../api/models/today-dto';
import { addDaysIso } from '../../shared/format/local-dates';
import { RecordType } from '../../shared/records/exercise-records';

/** How far ahead "next workout" looks on rest days. */
export const LOOKAHEAD_DAYS = 7;

export interface NextWorkout {
  /** The answer for the day found (or today's, when nothing is scheduled ahead). */
  day: TodayDto;
  /** Local date of the next training day; null if none in the lookahead (or finished). */
  date: string | null;
}

/**
 * Next training day of the active program. The API answers one local date at a time, so:
 * today → (if not training) the following week in parallel → the first training day.
 */
export async function findNextWorkout(
  fetchDay: (date: string) => Promise<TodayDto>,
  today: string,
): Promise<NextWorkout> {
  const first = await fetchDay(today);
  if (first.status === 'training' && first.routine) return { day: first, date: today };
  if (first.status === 'finished') return { day: first, date: null };

  const start =
    first.status === 'not_started'
      ? addDaysIso(today, first.startsInDays ?? 1)
      : addDaysIso(today, 1);
  const dates = Array.from({ length: LOOKAHEAD_DAYS }, (_, i) => addDaysIso(start, i));
  const days = await Promise.all(dates.map(fetchDay));
  const index = days.findIndex((d) => d.status === 'training' && d.routine);
  return index >= 0 ? { day: days[index], date: dates[index] } : { day: first, date: null };
}

export interface LatestRecord {
  exerciseId: string;
  name: string | null;
  type: RecordType;
  entry: RecordEntryDto;
}

/** Most recent records first (one row per record type), across all exercises. */
export function latestRecords(items: RecordsSummaryItemDto[], count: number): LatestRecord[] {
  const all: LatestRecord[] = items.flatMap((item) =>
    (['maxWeight', 'bestE1RM', 'maxVolume'] as const).flatMap((type) => {
      const entry = item[type];
      return entry ? [{ exerciseId: item.exerciseId, name: item.name, type, entry }] : [];
    }),
  );
  return all.sort((a, b) => b.entry.achievedAt.localeCompare(a.entry.achievedAt)).slice(0, count);
}
