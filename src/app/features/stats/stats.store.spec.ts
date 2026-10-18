import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RecordsSummaryItemDto } from '../../api/models/records-summary-item-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { rangeFrom } from '../../shared/charts/stat-range';
import { StatsStore, defaultExercise } from './stats.store';

const entry = (achievedAt: string) => ({
  value: 100,
  weightKg: 100,
  reps: 1,
  workoutId: 'w',
  achievedAt,
});
const item = (exerciseId: string, name: string, achievedAt: string): RecordsSummaryItemDto => ({
  exerciseId,
  name,
  maxWeight: entry(achievedAt),
  bestE1RM: null,
  maxVolume: null,
});
/** The generated client returns Promises: let them resolve before asserting. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

const window = { from: null, to: '2026-10-18T00:00:00.000Z', limitedByPlan: false };

describe('defaultExercise', () => {
  it('picks the exercise with the most recent record', () => {
    const records = [
      item('a', 'Squat', '2026-09-01T10:00:00Z'),
      item('b', 'Bench', '2026-10-10T10:00:00Z'),
    ];
    expect(defaultExercise(records)).toEqual({ id: 'b', name: 'Bench' });
    expect(defaultExercise([])).toBeNull();
  });
});

describe('StatsStore', () => {
  let httpMock: HttpTestingController;
  let store: StatsStore;
  const fullStats = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: { hasFeature: () => fullStats() } },
        StatsStore,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(StatsStore);
    TestBed.tick();
    httpMock.expectOne('/api/v1/records').flush([item('b', 'Bench', '2026-10-10T10:00:00Z')]);
  });

  afterEach(() => httpMock.verify());

  it('loads nothing until a tab is shown', async () => {
    await settle();
    TestBed.tick();
    expect(httpMock.match((r) => r.url.startsWith('/api/v1/stats/'))).toHaveLength(0);
  });

  it('the progress tab loads the default exercise and the total, in the browser zone', async () => {
    await settle();
    store.activate('progress');
    TestBed.tick();

    const exercise = httpMock.expectOne((r) => r.url === '/api/v1/stats/exercise/b');
    const total = httpMock.expectOne((r) => r.url === '/api/v1/stats/powerlifting-total');
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(exercise.request.params.get('tz')).toBe(tz);
    expect(exercise.request.params.get('from')).toBe(rangeFrom('90d'));
    expect(total.request.params.get('metric')).toBe('e1rm');
    exercise.flush({ exerciseId: 'b', points: [], window });
    total.flush({ metric: 'e1rm', points: [], bestTotal: null, window });

    // A new range refetches both.
    store.setRange('30d');
    TestBed.tick();
    httpMock
      .expectOne((r) => r.url === '/api/v1/stats/exercise/b')
      .flush({ exerciseId: 'b', points: [], window });
    httpMock
      .expectOne((r) => r.url === '/api/v1/stats/powerlifting-total')
      .flush({ metric: 'e1rm', points: [], bestTotal: null, window });
  });

  it('flags a Free user asking for more than 90 days, and a clamped answer', async () => {
    await settle();
    store.setRange('1y');
    expect(store.rangeLocked()).toBe(true);
    fullStats.set(true);
    expect(store.rangeLocked()).toBe(false);
    fullStats.set(false);

    store.activate('volume');
    TestBed.tick();
    httpMock
      .expectOne((r) => r.url === '/api/v1/stats/muscle-volume')
      .flush({ rows: [], window: { ...window, limitedByPlan: true } });
    await settle();
    expect(store.limitedWindow()?.limitedByPlan).toBe(true);
  });

  it('the consistency tab loads the year and the adherence of the active program', async () => {
    await settle();
    store.activate('consistency');
    TestBed.tick();
    httpMock
      .expectOne((r) => r.url === '/api/v1/stats/frequency')
      .flush({ year: 2026, weeks: [], heatmap: [], window });
    httpMock.expectOne('/api/v1/programs').flush([
      { id: 'p-old', status: 'completed', activatedAt: '2026-01-01T00:00:00Z' },
      { id: 'p-active', status: 'active', activatedAt: '2026-09-01T00:00:00Z' },
      { id: 'p-draft', status: 'draft', activatedAt: null },
    ]);
    await settle();
    TestBed.tick();

    expect(store.programs().map((p) => p.id)).toEqual(['p-active', 'p-old']);
    httpMock
      .expectOne((r) => r.url === '/api/v1/stats/program-adherence/p-active')
      .flush({
        programId: 'p-active',
        plannedSessions: 4,
        completedSessions: 3,
        adherencePercent: 75,
        extraSessions: 0,
        weeks: [],
        window,
      });
    await settle();
    expect(store.adherence()?.adherencePercent).toBe(75);
  });
});
