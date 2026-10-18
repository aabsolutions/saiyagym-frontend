import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { ExercisePicker } from '../../shared/exercises/exercise-picker';
import { exercise } from '../exercises/exercise-fixtures.spec-helpers';
import { RoutineBuilderPage } from './routine-builder-page';
import { RoutineBuilderStore } from './routine-builder.store';

@Component({ selector: 'app-exercise-picker', template: '' })
class PickerStub {
  readonly picked = output<ExerciseSummaryDto>();
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('RoutineBuilderPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RoutineBuilderPage,
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        RoutineBuilderStore,
        { provide: PreferencesStore, useValue: { units: signal('imperial') } },
        {
          provide: AuthStore,
          useValue: {
            user: signal({ preferences: { defaultRestSeconds: 120 } }),
            hasFeature: () => false,
          },
        },
        { provide: Notifier, useValue: { info: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(RoutineBuilderPage, {
      remove: { imports: [ExercisePicker] },
      add: { imports: [PickerStub] },
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('builds a routine from picked exercises and saves it in kg', async () => {
    const fixture = TestBed.createComponent(RoutineBuilderPage);
    const page = fixture.componentInstance;
    await fixture.whenStable();
    expect(page.hasUnsavedChanges()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string, index = 0) => {
      const input = el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector)[index];
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };

    // Picking an exercise adds it with 3 default sets (the user's default rest).
    const picker = fixture.debugElement.query((d) => d.componentInstance instanceof PickerStub);
    (picker.componentInstance as PickerStub).picked.emit(exercise({ id: 'bench', name: 'Bench' }));
    await fixture.whenStable();
    expect(page.hasUnsavedChanges()).toBe(true);
    expect(el.querySelectorAll('app-routine-item-editor')).toHaveLength(1);

    type('input[matInput]:not([type])', 'Push A'); // the routine name
    await fixture.whenStable();

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    const req = httpMock.expectOne('/api/v1/routines');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      name: 'Push A',
      exercises: [
        {
          exerciseId: 'bench',
          groupId: null,
          progression: null,
          sets: [
            {
              type: 'normal',
              repsMin: 8,
              repsMax: 12,
              weightKg: null,
              percent1RM: null,
              restSeconds: 120,
            },
            expect.anything(),
            expect.anything(),
          ],
        },
      ],
    });

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    req.flush({
      id: 'r1',
      name: 'Push A',
      notes: '',
      archived: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      exercises: [],
    });
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/routines', 'r1'], { replaceUrl: true });
    expect(page.hasUnsavedChanges()).toBe(false);
  });
});
