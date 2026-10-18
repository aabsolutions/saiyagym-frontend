/**
 * GET /exercises/{id}/records. Mirrors the backend's `ExerciseRecordsDto`
 * (src/modules/records/dto/records.dto.ts).
 *
 * TEMPORARY: openapi.json has no schema for this response — the records controller lives
 * in `records.module.ts` and the Nest swagger plugin only infers return types in
 * `*.controller.ts` files — so the generated client types it as `void` and even drops the
 * body (`clone({ body: undefined })`). ExerciseDetailStore calls it with HttpClient.
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

export const hasRecords = (records: ExerciseRecords | null): boolean =>
  !!records &&
  (!!records.maxWeight ||
    !!records.bestE1RM ||
    !!records.maxVolume ||
    records.repsAtWeight.length > 0);
