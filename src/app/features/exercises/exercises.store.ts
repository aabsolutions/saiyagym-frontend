import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, distinctUntilChanged, filter, from, of, pipe, switchMap, tap } from 'rxjs';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { ExerciseTagDto } from '../../api/models/exercise-tag-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { AuthStore } from '../../core/auth/auth.store';
import { defaultTierGoal } from '../../shared/exercises/exercise-taxonomy';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import {
  DEFAULT_PAGE_SIZE,
  ExerciseFilters,
  activeFilterCount,
  emptyFilters,
  toListParams,
} from './exercise-filters';

interface ExercisesState {
  filters: ExerciseFilters;
  page: number;
  limit: number;
  items: ExerciseSummaryDto[];
  total: number;
  tags: ExerciseTagDto[];
  /** Own custom exercises (for the plan limit); null until known. */
  customCount: number | null;
  /** Filters come from the URL: nothing loads until the page hands them over. */
  initialized: boolean;
}

/**
 * Catalog list. Provided at the feature root so filters/page survive a trip to the
 * detail page and back.
 */
export const ExercisesStore = signalStore(
  withState<ExercisesState>({
    filters: emptyFilters('hypertrophy'),
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    items: [],
    total: 0,
    tags: [],
    customCount: null,
    initialized: false,
  }),
  withRequestStatus(),
  withProps(() => ({ _api: inject(ExercisesService), _auth: inject(AuthStore) })),
  withComputed(({ filters, page, limit, initialized, customCount, _auth }) => ({
    defaultGoal: computed(() => defaultTierGoal(_auth.user()?.profile.goal)),
    activeFilters: computed(() => activeFilterCount(filters())),
    /** What the next load should fetch; null before initialization. */
    request: computed(() => (initialized() ? toListParams(filters(), page(), limit()) : null)),
    customLimit: computed(() => _auth.limit('customExercises')),
    canCreateCustom: computed(() => {
      const max = _auth.limit('customExercises');
      const count = customCount();
      return max === null || count === null || count < max;
    }),
  })),
  withMethods((store) => {
    const load = rxMethod<ReturnType<typeof store.request>>(
      pipe(
        filter((request) => request !== null),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(() => patchState(store, setPending())),
        // switchMap: a newer filter combination drops the stale response.
        switchMap((request) =>
          from(store._api.exercisesControllerList(request)).pipe(
            tap((page) =>
              patchState(store, { items: page.items, total: page.meta.total }, setFulfilled()),
            ),
            catchError((error: unknown) => {
              patchState(store, setError(error));
              return of(null);
            }),
          ),
        ),
      ),
    );

    const replaceItem = (id: string, patch: Partial<ExerciseSummaryDto>) =>
      patchState(store, (state) => ({
        items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      }));

    return {
      _load: load,

      init(filters: ExerciseFilters, page: number, limit: number): void {
        patchState(store, { filters, page, limit, initialized: true });
      },

      /** Any filter change goes back to page 1. */
      setFilters(patch: Partial<ExerciseFilters>): void {
        patchState(store, (state) => ({ filters: { ...state.filters, ...patch }, page: 1 }));
      },

      clearFilters(): void {
        patchState(store, (state) => ({
          filters: { ...emptyFilters(state.filters.goal), q: state.filters.q },
          page: 1,
        }));
      },

      setPage(page: number, limit: number): void {
        patchState(store, { page, limit });
      },

      /** Re-runs the current query (after create/delete elsewhere). */
      async refresh(): Promise<void> {
        const request = store.request();
        if (!request) return;
        try {
          const page = await store._api.exercisesControllerList(request);
          patchState(store, { items: page.items, total: page.meta.total });
        } catch {
          // errorInterceptor already reported it.
        }
      },

      async loadTags(): Promise<void> {
        if (store.tags().length) return;
        try {
          patchState(store, { tags: await store._api.exerciseTagsControllerList() });
        } catch {
          // Filter just shows no tags.
        }
      },

      async loadCustomCount(): Promise<void> {
        try {
          const page = await store._api.exercisesControllerList({
            custom: true,
            sort: 'name',
            page: 1,
            limit: 1,
          });
          patchState(store, { customCount: page.meta.total });
        } catch {
          patchState(store, { customCount: null });
        }
      },

      /** Optimistic; reverted if the API refuses. */
      async toggleFavorite(exercise: ExerciseSummaryDto): Promise<void> {
        const isFavorite = !exercise.isFavorite;
        replaceItem(exercise.id, { isFavorite });
        try {
          await store._api.exercisesControllerUpdatePrefs({
            id: exercise.id,
            body: { isFavorite },
          });
        } catch {
          replaceItem(exercise.id, { isFavorite: !isFavorite });
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      store._load(store.request);
      void store.loadTags();
    },
  }),
);

export type ExercisesStore = InstanceType<typeof ExercisesStore>;
