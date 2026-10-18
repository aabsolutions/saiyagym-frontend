import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../core/auth/auth.store';
import { weekDatesIso, todayIso } from '../../shared/format/local-dates';
import { WeekStore } from './week.store';

describe('WeekStore', () => {
  let httpMock: HttpTestingController;
  let store: WeekStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WeekStore,
        { provide: AuthStore, useValue: { user: signal({ preferences: { firstDayOfWeek: 7 } }) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(WeekStore);
  });

  afterEach(() => httpMock.verify());

  const day = (date: string) => ({
    date,
    status: 'rest',
    week: 1,
    startsInDays: null,
    dayLabel: null,
    routine: null,
    programId: 'p1',
    programName: 'PPL',
    totalWeeks: 4,
    isDeloadWeek: false,
    progressionEnabled: true,
  });

  it('asks the API for each LOCAL date of the week, in the user’s week order', async () => {
    const loading = store.show('p1');
    const reqs = httpMock.match((r) => r.url === '/api/v1/programs/active/today');
    const dates = weekDatesIso(todayIso(), 7);

    expect(reqs.map((r) => r.request.params.get('date'))).toEqual(dates);
    expect(reqs.every((r) => r.request.params.get('programId') === 'p1')).toBe(true);
    reqs.forEach((r) => r.flush(day(r.request.params.get('date')!)));
    await loading;

    expect(store.days().map((d) => d.date)).toEqual(dates);
  });

  it('moves a week back and forth', async () => {
    const first = store.show('p1');
    httpMock.match(() => true).forEach((r) => r.flush(day(r.request.params.get('date')!)));
    await first;
    const thisWeekStart = store.dates()[0];

    const prev = store.shiftWeek(-1);
    const reqs = httpMock.match(() => true);
    expect(reqs[0].request.params.get('date')).not.toBe(thisWeekStart);
    reqs.forEach((r) => r.flush(day(r.request.params.get('date')!)));
    await prev;
    expect(store.dates()).toHaveLength(7);
  });
});
