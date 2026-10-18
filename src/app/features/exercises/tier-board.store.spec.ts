import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../core/auth/auth.store';
import { exercise } from './exercise-fixtures.spec-helpers';
import { TierBoardStore } from './tier-board.store';

const settle = () => new Promise((resolve) => setTimeout(resolve));
const curl = exercise({ id: 'curl', name: 'Curl' });

describe('TierBoardStore', () => {
  let httpMock: HttpTestingController;
  let store: TierBoardStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TierBoardStore,
        {
          provide: AuthStore,
          useValue: { user: signal({ profile: { goal: 'powerlifting' } }) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(TierBoardStore);
    TestBed.runInInjectionContext(() => store.connect(store.query));
    TestBed.tick();
  });

  afterEach(() => httpMock.verify());

  const flushBoard = async (source: string) => {
    const req = httpMock.expectOne((r) => r.url === '/api/v1/exercises/tier-list');
    expect(req.request.params.get('source')).toBe(source);
    req.flush({ goal: 'powerlifting', muscle: null, source, tiers: { C: [curl] }, unranked: [] });
    await settle();
    return req;
  };

  it("defaults to the profile's goal", async () => {
    const req = await flushBoard('global');
    expect(req.request.params.get('goal')).toBe('powerlifting');
  });

  it('does not move cards in global mode', async () => {
    await flushBoard('global');
    await store.moveTo('curl', 'S');
    httpMock.expectNone('/api/v1/exercises/curl/prefs');
    expect(store.board().columns.C).toHaveLength(1);
  });

  it('saves the personal tier on drop, and rolls back if the API fails', async () => {
    await flushBoard('global');
    store.setSource('personal');
    TestBed.tick();
    await flushBoard('personal');

    const ok = store.moveTo('curl', 'A');
    expect(store.board().columns.A.map((e) => e.id)).toEqual(['curl']);
    const save = httpMock.expectOne('/api/v1/exercises/curl/prefs');
    // The profile goal is powerlifting: only that goal is sent.
    expect(save.request.body).toEqual({ personalTiers: { powerlifting: 'A' } });
    save.flush({
      exerciseId: 'curl',
      personalTiers: { hypertrophy: null, powerlifting: 'A' },
      isFavorite: false,
    });
    await ok;
    expect(store.board().columns.A).toHaveLength(1);

    const failing = store.moveTo('curl', 'S');
    httpMock
      .expectOne('/api/v1/exercises/curl/prefs')
      .flush({ code: 'X' }, { status: 500, statusText: 'x' });
    await failing;
    expect(store.board().columns.S).toEqual([]);
    expect(store.board().columns.A.map((e) => e.id)).toEqual(['curl']);
  });
});
