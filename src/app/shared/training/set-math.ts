/** Domain rules from SPEC "Estadísticas y PR". Mirrors the backend's calculations. */

export type SetType = 'warmup' | 'normal' | 'dropset' | 'failure';

/** Warmups never count toward volume or PRs. */
export const isWorkingSet = (type: SetType): boolean => type !== 'warmup';

/** Epley: weight × (1 + reps/30), only for 1–12 reps. Null when it doesn't apply. */
export function epley(weightKg: number | null, reps: number | null): number | null {
  if (weightKg === null || reps === null || weightKg <= 0 || reps < 1 || reps > 12) return null;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export interface CountableSet {
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
}

/** kg × reps of completed working sets. */
export function volumeKg(sets: readonly CountableSet[]): number {
  return sets.reduce(
    (sum, s) =>
      s.completed && isWorkingSet(s.type) && s.weightKg !== null && s.reps !== null
        ? sum + s.weightKg * s.reps
        : sum,
    0,
  );
}
