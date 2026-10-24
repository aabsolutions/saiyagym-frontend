import { ExerciseGuideDto } from '../../api/models/exercise-guide-dto';
import { GuidesDto } from '../../api/models/guides-dto';

/** What the user may see of an exercise's execution guide. The API decides (`GET /guides`). */
export type GuideStatus =
  { kind: 'none' } | { kind: 'locked' } | { kind: 'unlocked'; guides: ExerciseGuideDto[] };

export const NO_GUIDE: GuideStatus = { kind: 'none' };

export function guideStatusOf(access: GuidesDto | null, exerciseId: string): GuideStatus {
  const guides = access?.items.find((item) => item.exerciseId === exerciseId)?.guides ?? [];
  if (guides.length) return { kind: 'unlocked', guides };
  return access?.lockedExerciseIds.includes(exerciseId) ? { kind: 'locked' } : NO_GUIDE;
}

/** Leading "1." / "2)" / "-" / "•" an admin may have typed: the list numbers the steps itself. */
const BULLET = /^(?:\d+[.)]|[-•*])\s+/;

/** `instructions` hold one step per line. */
export function instructionSteps(text: string | null | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim().replace(BULLET, ''))
    .filter(Boolean);
}
