import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { emptyHistoryFilters, localDayStart, monthRange } from './history-model';
import { HistoryStore } from './history.store';

const ROUTINE = '1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b';
const empty = { items: [], meta: { page: 1, limit: 20, total: 0 } };

describe('HistoryStore', () => {
  let httpMock: HttpTestingController;
  let store: HistoryStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HistoryStore],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(HistoryStore);
    TestBed.tick();
    httpMock.expectOne((r) => r.url === '/api/v1/routines').flush(empty);
  });

  afterEach(() => httpMock.verify());

  const workouts = () => httpMock.match((r) => r.url === '/api/v1/workouts');

  it('loads nothing until the page hands over the URL state, then the list and the month', () => {
    TestBed.tick();
    expect(workouts()).toHaveLength(0);

    store.init({ ...emptyHistoryFilters(), routineId: ROUTINE, from: '2026-10-05' }, '2026-10', 2);
    TestBed.tick();
    const [a, b] = workouts();
    const list = [a, b].find((r) => r.request.params.get('routineId'))!;
    const month = [a, b].find((r) => r !== list)!;

    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.get('from')).toBe(localDayStart('2026-10-05'));
    expect(month.request.params.get('from')).toBe(monthRange('2026-10').from);
    expect(month.request.params.get('to')).toBe(monthRange('2026-10').to);
    expect(month.request.params.get('limit')).toBe('100');
    list.flush(empty);
    month.flush(empty);
  });

  it('a calendar day filters the list to that day and goes back to page 1', () => {
    store.init(emptyHistoryFilters(), '2026-10', 3);
    TestBed.tick();
    workouts().forEach((r) => r.flush(empty));

    store.selectDay('2026-10-07');
    expect(store.page()).toBe(1);
    TestBed.tick();
    const [list] = workouts();
    expect(list.request.params.get('from')).toBe(localDayStart('2026-10-07'));
    expect(list.request.params.get('to')).toBe(localDayStart('2026-10-08'));
    list.flush(empty);
  });
});
