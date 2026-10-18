import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExerciseDetailStore } from './exercise-detail.store';
import { exerciseDetail } from './exercise-fixtures.spec-helpers';
import { ExerciseRecords } from '../../shared/records/exercise-records';

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('ExerciseDetailStore', () => {
  let httpMock: HttpTestingController;
  let store: ExerciseDetailStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ExerciseDetailStore],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ExerciseDetailStore);
  });

  afterEach(() => httpMock.verify());

  it('loads the exercise, then its records and history', async () => {
    const records: ExerciseRecords = {
      exerciseId: 'ex-1',
      maxWeight: { value: 180, weightKg: 180, reps: 1, workoutId: 'w1', achievedAt: '2026-01-01' },
      bestE1RM: null,
      maxVolume: null,
      repsAtWeight: [],
    };
    const loading = store.load('ex-1');
    httpMock.expectOne('/api/v1/exercises/ex-1').flush(exerciseDetail());
    await settle();

    // Regression: the generated client drops this body (no schema in openapi.json).
    httpMock.expectOne('/api/v1/exercises/ex-1/records').flush(records);
    const history = httpMock.expectOne((r) => r.url === '/api/v1/exercises/ex-1/history');
    expect(history.request.params.get('limit')).toBe('10');
    history.flush({ items: [], meta: { page: 1, limit: 10, total: 0 } });
    await loading;

    expect(store.exercise()?.id).toBe('ex-1');
    expect(store.records()?.maxWeight?.value).toBe(180);
  });

  it('shows the exercise even when it has no records or history yet', async () => {
    const loading = store.load('ex-1');
    httpMock.expectOne('/api/v1/exercises/ex-1').flush(exerciseDetail());
    await settle();
    httpMock
      .expectOne('/api/v1/exercises/ex-1/records')
      .flush(null, { status: 404, statusText: 'x' });
    httpMock
      .expectOne((r) => r.url === '/api/v1/exercises/ex-1/history')
      .flush(null, { status: 500, statusText: 'x' });
    await loading;

    expect(store.exercise()).not.toBeNull();
    expect(store.records()).toBeNull();
    expect(store.history()).toEqual([]);
  });

  it('sets the personal tier of one goal without touching the other', async () => {
    const loading = store.load('ex-1');
    httpMock
      .expectOne('/api/v1/exercises/ex-1')
      .flush(exerciseDetail({ personalTiers: { hypertrophy: 'A', powerlifting: null } }));
    await settle();
    httpMock.expectOne('/api/v1/exercises/ex-1/records').flush(null);
    httpMock
      .expectOne((r) => r.url === '/api/v1/exercises/ex-1/history')
      .flush({ items: [], meta: { page: 1, limit: 10, total: 0 } });
    await loading;

    const saving = store.setPersonalTier('powerlifting', 'C');
    expect(store.exercise()?.personalTiers).toEqual({ hypertrophy: 'A', powerlifting: 'C' });
    const req = httpMock.expectOne('/api/v1/exercises/ex-1/prefs');
    expect(req.request.body).toEqual({ personalTiers: { powerlifting: 'C' } });
    req.flush({
      exerciseId: 'ex-1',
      isFavorite: false,
      personalTiers: { hypertrophy: 'A', powerlifting: 'C' },
    });
    await saving;
    expect(store.exercise()?.personalTiers).toEqual({ hypertrophy: 'A', powerlifting: 'C' });
  });

  it('reverts the favorite if saving fails', async () => {
    const loading = store.load('ex-1');
    httpMock.expectOne('/api/v1/exercises/ex-1').flush(exerciseDetail());
    await settle();
    httpMock.expectOne('/api/v1/exercises/ex-1/records').flush(null);
    httpMock
      .expectOne((r) => r.url === '/api/v1/exercises/ex-1/history')
      .flush({ items: [], meta: { page: 1, limit: 10, total: 0 } });
    await loading;

    const toggling = store.toggleFavorite();
    expect(store.exercise()?.isFavorite).toBe(true);
    httpMock
      .expectOne('/api/v1/exercises/ex-1/prefs')
      .flush(null, { status: 500, statusText: 'x' });
    await toggling;
    expect(store.exercise()?.isFavorite).toBe(false);
  });
});
