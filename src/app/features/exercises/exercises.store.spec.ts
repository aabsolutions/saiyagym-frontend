import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../core/auth/auth.store';
import { emptyFilters } from './exercise-filters';
import { exercise } from './exercise-fixtures.spec-helpers';
import { ExercisesStore } from './exercises.store';

const settle = () => new Promise((resolve) => setTimeout(resolve));
const page = (items: ReturnType<typeof exercise>[], total = items.length) => ({
  items,
  meta: { page: 1, limit: 20, total },
});

describe('ExercisesStore', () => {
  let httpMock: HttpTestingController;
  let store: ExercisesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ExercisesStore,
        {
          provide: AuthStore,
          useValue: { user: signal(null), limit: () => 10 },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ExercisesStore);
    TestBed.tick();
    httpMock.expectOne('/api/v1/exercise-tags').flush([]);
  });

  afterEach(() => httpMock.verify());

  const listRequests = () =>
    httpMock.match((req) => req.url === '/api/v1/exercises' && !req.params.has('custom'));

  it('loads nothing until the page hands over the URL filters', () => {
    TestBed.tick();
    expect(listRequests()).toHaveLength(0);

    store.init({ ...emptyFilters('hypertrophy'), muscle: 'chest' }, 2, 20);
    TestBed.tick();
    const [req] = listRequests();
    expect(req.request.params.get('muscle')).toBe('chest');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(page([exercise()], 41));
  });

  it('drops a stale response when filters change mid-flight', async () => {
    store.init(emptyFilters('hypertrophy'), 1, 20);
    TestBed.tick();
    const [first] = listRequests();

    store.setFilters({ muscle: 'quads' });
    TestBed.tick();
    const [second] = listRequests();

    second.flush(page([exercise({ id: 'quads-1', name: 'Leg press' })]));
    await settle();
    first.flush(page([exercise({ id: 'stale' })]));
    await settle();

    expect(store.items().map((e) => e.id)).toEqual(['quads-1']);
  });

  it('goes back to page 1 on any filter change', () => {
    store.init(emptyFilters('hypertrophy'), 3, 20);
    store.setFilters({ tier: 'S' });
    expect(store.page()).toBe(1);
    TestBed.tick();
    listRequests().forEach((r) => r.flush(page([])));
  });

  it('toggles a favorite optimistically and reverts if the API refuses', async () => {
    store.init(emptyFilters('hypertrophy'), 1, 20);
    TestBed.tick();
    listRequests()[0].flush(page([exercise({ id: 'a' })]));
    await settle();

    const toggle = store.toggleFavorite(store.items()[0]);
    expect(store.items()[0].isFavorite).toBe(true);
    httpMock
      .expectOne('/api/v1/exercises/a/prefs')
      .flush({ code: 'X' }, { status: 500, statusText: 'x' });
    await toggle;
    expect(store.items()[0].isFavorite).toBe(false);
  });

  it('knows when the custom-exercise slots are used up', async () => {
    const counting = store.loadCustomCount();
    httpMock.expectOne((r) => r.params.get('custom') === 'true').flush(page([], 10));
    await counting;
    expect(store.canCreateCustom()).toBe(false);
  });
});
