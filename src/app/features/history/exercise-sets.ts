import { ExercisePerformanceDto } from '../../api/models/exercise-performance-dto';
import { SetType, epley, isWorkingSet } from '../../shared/training/set-math';

export interface SetRow {
  workoutId: string;
  startedAt: string;
  /** 1-based within the session. */
  n: number;
  /** First row of its session (the table shows the date once per session). */
  firstOfSession: boolean;
  sessionSets: number;
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  /** Epley, working sets of 1–12 reps only. */
  e1rm: number | null;
  /** weight × reps of a completed working set, else null. */
  volumeKg: number | null;
}

/** Sessions (newest first, as the API sends them) → one row per set performed. */
export function toSetRows(sessions: readonly ExercisePerformanceDto[]): SetRow[] {
  return sessions.flatMap((session) =>
    session.sets.map((set, i) => {
      const counts = set.completed && isWorkingSet(set.type);
      return {
        workoutId: session.workoutId,
        startedAt: session.startedAt,
        n: i + 1,
        firstOfSession: i === 0,
        sessionSets: session.sets.length,
        type: set.type,
        weightKg: set.weightKg,
        reps: set.reps,
        completed: set.completed,
        e1rm: counts ? epley(set.weightKg, set.reps) : null,
        volumeKg:
          counts && set.weightKg !== null && set.reps !== null ? set.weightKg * set.reps : null,
      };
    }),
  );
}
