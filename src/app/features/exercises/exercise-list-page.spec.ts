import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ExerciseFilters, emptyFilters } from './exercise-filters';
import { ExerciseListPage, SEARCH_DEBOUNCE_MS } from './exercise-list-page';
import { ExercisesStore } from './exercises.store';

describe('ExerciseListPage', () => {
  const filters = signal<ExerciseFilters>(emptyFilters('hypertrophy'));
  const store = {
    filters,
    page: signal(1),
    limit: signal(20),
    items: signal([]),
    total: signal(0),
    tags: signal([]),
    customCount: signal(0),
    customLimit: signal(10),
    canCreateCustom: signal(true),
    activeFilters: computed(() => 0),
    defaultGoal: signal('hypertrophy'),
    isPending: signal(false),
    isFulfilled: signal(true),
    error: signal(null),
    init: vi.fn((f: ExerciseFilters) => filters.set(f)),
    setFilters: vi.fn((patch: Partial<ExerciseFilters>) =>
      filters.update((f) => ({ ...f, ...patch })),
    ),
    loadCustomCount: vi.fn(() => Promise.resolve()),
    setPage: vi.fn(),
    clearFilters: vi.fn(),
    toggleFavorite: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    filters.set(emptyFilters('hypertrophy'));
    store.setFilters.mockClear();
    store.init.mockClear();
    TestBed.configureTestingModule({
      imports: [
        ExerciseListPage,
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [provideRouter([]), { provide: ExercisesStore, useValue: store }],
    });
  });

  afterEach(() => vi.useRealTimers());

  const create = (queryParams: Record<string, string> = {}) => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParams } },
    });
    const fixture = TestBed.createComponent(ExerciseListPage);
    fixture.detectChanges();
    return fixture;
  };

  it('starts from the filters in the URL', () => {
    create({ muscle: 'chest', q: 'press', page: '2' });
    expect(store.init).toHaveBeenCalledWith(
      expect.objectContaining({ muscle: 'chest', q: 'press' }),
      2,
      20,
    );
  });

  it('debounces typing into a single search', () => {
    const fixture = create();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]')!;
    for (const value of ['b', 'be', 'ben', 'bench']) {
      (input as HTMLInputElement).value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      vi.advanceTimersByTime(100);
    }
    expect(store.setFilters).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(store.setFilters).toHaveBeenCalledTimes(1);
    expect(store.setFilters).toHaveBeenCalledWith({ q: 'bench' });
  });
});
