import { ExerciseRecordsDto } from '../../api/models/exercise-records-dto';
import { RecordEntryDto } from '../../api/models/record-entry-dto';

/** GET /exercises/{id}/records (`StatsService.recordsControllerForExercise`). */
export type ExerciseRecords = ExerciseRecordsDto;
export type RecordEntry = RecordEntryDto;

export type RecordType = 'maxWeight' | 'bestE1RM' | 'maxVolume' | 'repsAtWeight';

export const hasRecords = (records: ExerciseRecords | null): boolean =>
  !!records &&
  (!!records.maxWeight ||
    !!records.bestE1RM ||
    !!records.maxVolume ||
    records.repsAtWeight.length > 0);

/** Records (still standing) that were set in `workoutId`. */
export function recordsFromWorkout(
  records: ExerciseRecords,
  workoutId: string,
): { type: RecordType; entry: RecordEntry }[] {
  const found: { type: RecordType; entry: RecordEntry }[] = [];
  for (const type of ['maxWeight', 'bestE1RM', 'maxVolume'] as const) {
    const entry = records[type];
    if (entry?.workoutId === workoutId) found.push({ type, entry });
  }
  for (const entry of records.repsAtWeight)
    if (entry.workoutId === workoutId) found.push({ type: 'repsAtWeight', entry });
  return found;
}
