import { WorkoutDetailDto } from '../../api/models/workout-detail-dto';

/** Test data factory (not a spec). */
export const workoutDetail = (overrides: Partial<WorkoutDetailDto> = {}): WorkoutDetailDto => ({
  id: 'w1',
  name: 'Push',
  notes: '',
  rating: 4,
  routineId: null,
  programId: null,
  startedAt: '2026-10-01T10:00:00.000Z',
  finishedAt: '2026-10-01T11:00:00.000Z',
  durationSeconds: 3600,
  exerciseCount: 1,
  workingSets: 2,
  volumeKg: 1060,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T11:00:00.000Z',
  exercises: [
    {
      id: 'we1',
      exerciseId: 'bench',
      name: 'Bench',
      routineExerciseId: 'slot-1',
      groupId: null,
      notes: '',
      volumeKg: 1060,
      sets: [
        { id: 's0', type: 'warmup', weightKg: 60, reps: 10, completed: true, completedAt: null },
        { id: 's1', type: 'normal', weightKg: 102.5, reps: 5, completed: true, completedAt: null },
        { id: 's2', type: 'normal', weightKg: 102.5, reps: 5, completed: true, completedAt: null },
      ],
    },
  ],
  ...overrides,
});
