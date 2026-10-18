import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { recordsControllerForExercise } from '../../api/fn/stats/records-controller-for-exercise';

/**
 * GET /exercises/{id}/records. Mirrors the backend's `ExerciseRecordsDto`
 * (src/modules/records/dto/records.dto.ts).
 *
 * TEMPORARY: openapi.json has no schema for this response — the records controller lives
 * in `records.module.ts` and the Nest swagger plugin only infers return types in
 * `*.controller.ts` files — so the generated client types it as `void` and even drops the
 * body (`clone({ body: undefined })`). ExerciseRecordsApi calls it with HttpClient.
 * Delete this file once the backend declares the response and `npm run api:generate`
 * emits the model.
 */
export interface RecordEntry {
  /** kg for weight/e1RM/volume records, reps for repsAtWeight. */
  value: number;
  weightKg: number;
  reps: number;
  workoutId: string;
  achievedAt: string;
}

export interface ExerciseRecords {
  exerciseId: string;
  maxWeight: RecordEntry | null;
  bestE1RM: RecordEntry | null;
  maxVolume: RecordEntry | null;
  /** Most reps at each exact weight, ascending by weight (`value` = reps). */
  repsAtWeight: RecordEntry[];
}

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

@Injectable({ providedIn: 'root' })
export class ExerciseRecordsApi {
  private readonly http = inject(HttpClient);

  /** Same path as the generated client, which can't be used (see above). */
  get(exerciseId: string): Promise<ExerciseRecords> {
    const url = recordsControllerForExercise.PATH.replace('{id}', encodeURIComponent(exerciseId));
    return firstValueFrom(this.http.get<ExerciseRecords>(url));
  }
}
