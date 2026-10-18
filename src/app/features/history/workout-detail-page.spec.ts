import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Notifier } from '../../core/notify/notifier';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { HistoryStore } from './history.store';
import { WorkoutDetailPage } from './workout-detail-page';
import { WorkoutDetailStore } from './workout-detail.store';
import { workoutDetail } from './workout-fixtures.spec-helpers';

const settle = () => new Promise((resolve) => setTimeout(resolve));
const noRecords = {
  exerciseId: 'bench',
  maxWeight: null,
  bestE1RM: null,
  maxVolume: null,
  repsAtWeight: [],
};

describe('WorkoutDetailPage', () => {
  let httpMock: HttpTestingController;
  const notifier = { info: vi.fn() };

  beforeEach(() => {
    notifier.info.mockClear();
    TestBed.configureTestingModule({
      imports: [
        WorkoutDetailPage,
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        WorkoutDetailStore,
        { provide: HistoryStore, useValue: { refresh: vi.fn() } },
        { provide: PreferencesStore, useValue: { units: signal('imperial') } },
        { provide: Notifier, useValue: notifier },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const open = async (detail = workoutDetail()) => {
    const fixture = TestBed.createComponent(WorkoutDetailPage);
    fixture.componentRef.setInput('id', detail.id);
    fixture.detectChanges();
    httpMock.expectOne(`/api/v1/workouts/${detail.id}`).flush(detail);
    await settle();
    httpMock.expectOne('/api/v1/exercises/bench/records').flush(noRecords);
    await fixture.whenStable();
    return fixture;
  };

  const buttons = (el: HTMLElement) =>
    [...el.querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '');

  it('keeps a session still being logged on the phone read-only', async () => {
    const fixture = await open(workoutDetail({ finishedAt: null }));
    const el = fixture.nativeElement as HTMLElement;
    expect(buttons(el).some((t) => t.includes('history.detail.edit'))).toBe(false);
    expect(el.textContent).toContain('history.detail.liveReadOnly');
  });

  it('corrects reps and sends untouched weights back as the exact stored kg', async () => {
    const fixture = await open();
    const el = fixture.nativeElement as HTMLElement;
    [...el.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('history.detail.edit'))!
      .click();
    await fixture.whenStable();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

    // Third set: reps 5 → 4 (inputs per set: weight, reps).
    const numbers = el.querySelectorAll<HTMLInputElement>('.edit-set input[type="number"]');
    numbers[5].value = '4';
    numbers[5].dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    const patch = httpMock.expectOne({ method: 'PATCH', url: '/api/v1/workouts/w1' });
    const sets = patch.request.body.exercises[0].sets;
    expect(sets.map((s: { weightKg: number }) => s.weightKg)).toEqual([60, 102.5, 102.5]);
    expect(sets.map((s: { reps: number }) => s.reps)).toEqual([10, 5, 4]);

    patch.flush({ ...workoutDetail(), newRecords: [] });
    await settle();
    httpMock.expectOne('/api/v1/exercises/bench/records').flush(noRecords);
    await fixture.whenStable();
    expect(notifier.info).toHaveBeenCalledWith('common.saved', { count: 0 });
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });
});
