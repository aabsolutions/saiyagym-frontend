import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WorkoutDetailStore } from './workout-detail.store';
import { workoutDetail } from './workout-fixtures.spec-helpers';

const settle = () => new Promise((resolve) => setTimeout(resolve));
const entry = (workoutId: string, value: number) => ({
  value,
  weightKg: value,
  reps: 1,
  workoutId,
  achievedAt: '2026-10-01T10:30:00Z',
});

describe('WorkoutDetailStore', () => {
  let httpMock: HttpTestingController;
  let store: WorkoutDetailStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WorkoutDetailStore],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(WorkoutDetailStore);
  });

  afterEach(() => httpMock.verify());

  const flushRecords = (workoutId: string) =>
    httpMock.expectOne('/api/v1/exercises/bench/records').flush({
      exerciseId: 'bench',
      maxWeight: entry(workoutId, 110),
      bestE1RM: entry('another-session', 125),
      maxVolume: null,
      repsAtWeight: [{ ...entry(workoutId, 8), weightKg: 80 }],
    });

  it('shows only the records (still standing) set in this session', async () => {
    const loading = store.load('w1');
    httpMock.expectOne('/api/v1/workouts/w1').flush(workoutDetail());
    await settle();
    flushRecords('w1');
    await loading;

    expect(store.records().map((r) => r.type)).toEqual(['maxWeight', 'repsAtWeight']);
  });

  it('saves a correction and returns the records it broke', async () => {
    const loading = store.load('w1');
    httpMock.expectOne('/api/v1/workouts/w1').flush(workoutDetail());
    await settle();
    flushRecords('nobody');
    await loading;

    const saving = store.save({ name: 'Push', exercises: [] });
    const patch = httpMock.expectOne({ method: 'PATCH', url: '/api/v1/workouts/w1' });
    const broken = {
      type: 'maxWeight',
      exerciseId: 'bench',
      value: 120,
      previous: 110,
      weightKg: 120,
      reps: 1,
    };
    patch.flush({ ...workoutDetail(), newRecords: [broken] });
    await settle();
    flushRecords('w1');

    expect(await saving).toEqual([broken]);
    expect(store.workout()).not.toHaveProperty('newRecords');
    expect(store.records()).toHaveLength(2);
  });
});
