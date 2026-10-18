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
import { RoutineSummaryDto } from '../../api/models/routine-summary-dto';
import { WorkoutSummaryDto } from '../../api/models/workout-summary-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { RoutinesService } from '../../api/services/routines.service';
import { WorkoutsService } from '../../api/services/workouts.service';
import { todayIso } from '../../shared/format/local-dates';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import {
  HistoryFilters,
  MONTH_LIMIT,
  emptyHistoryFilters,
  groupByLocalDay,
  monthRange,
  toListParams,
} from './history-model';

interface HistoryState {
  month: string;
  monthWorkouts: WorkoutSummaryDto[];
  filters: HistoryFilters;
  page: number;
  items: WorkoutSummaryDto[];
  total: number;
  /** All routines (archived too): filter options and calendar colors. */
  routines: RoutineSummaryDto[];
  /** Label of the selected exercise filter (it comes from the URL as an id). */
  exerciseName: string | null;
  initialized: boolean;
}

/** Feature-wide: filters, page and month survive opening a session and coming back. */
export const HistoryStore = signalStore(
  withState<HistoryState>({
    month: todayIso().slice(0, 7),
    monthWorkouts: [],
    filters: emptyHistoryFilters(),
    page: 1,
    items: [],
    total: 0,
    routines: [],
    exerciseName: null,
    initialized: false,
  }),
  withRequestStatus(),
  withProps(() => ({
    _workouts: inject(WorkoutsService),
    _routines: inject(RoutinesService),
    _exercises: inject(ExercisesService),
  })),
  withComputed(({ filters, page, month, initialized, monthWorkouts, routines }) => ({
    listRequest: computed(() => (initialized() ? toListParams(filters(), page()) : null)),
    monthRequest: computed(() => (initialized() ? month() : null)),
    byDay: computed(() => groupByLocalDay(monthWorkouts())),
    routineOrder: computed(() => routines().map((r) => r.id)),
    routineName: computed(() => {
      const names = new Map(routines().map((r) => [r.id, r.name]));
      return (id: string | null) => (id ? (names.get(id) ?? null) : null);
    }),
  })),
  withMethods((store) => {
    const json = <T>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

    return {
      _loadList: rxMethod<ReturnType<typeof store.listRequest>>(
        pipe(
          filter((r) => r !== null),
          distinctUntilChanged(json),
          tap(() => patchState(store, setPending())),
          switchMap((request) =>
            from(store._workouts.workoutsControllerList(request)).pipe(
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
      ),

      _loadMonth: rxMethod<string | null>(
        pipe(
          filter((m) => m !== null),
          distinctUntilChanged(),
          switchMap((month) =>
            from(
              store._workouts.workoutsControllerList({
                ...monthRange(month),
                status: 'all',
                page: 1,
                limit: MONTH_LIMIT,
              }),
            ).pipe(
              tap((page) => patchState(store, { monthWorkouts: page.items })),
              catchError(() => of(null)),
            ),
          ),
        ),
      ),

      init(filters: HistoryFilters, month: string, page: number): void {
        patchState(store, { filters, month, page, initialized: true });
      },

      setFilters(patch: Partial<HistoryFilters>): void {
        patchState(store, (s) => ({ filters: { ...s.filters, ...patch }, page: 1 }));
      },

      clearFilters(): void {
        patchState(store, { filters: emptyHistoryFilters(), page: 1, exerciseName: null });
      },

      /** Calendar click: the list shows that local day. */
      selectDay(date: string): void {
        patchState(store, (s) => ({ filters: { ...s.filters, from: date, to: date }, page: 1 }));
      },

      setPage: (page: number) => patchState(store, { page }),
      setMonth: (month: string) => patchState(store, { month }),
      setExerciseName: (exerciseName: string | null) => patchState(store, { exerciseName }),

      async loadRoutines(): Promise<void> {
        try {
          const page = await store._routines.routinesControllerList({
            archived: 'all',
            page: 1,
            limit: 100,
          });
          patchState(store, { routines: page.items });
        } catch {
          // No names/colors: the calendar still shows dots.
        }
      },

      /** The exercise filter arrives as an id (URL); fetch its name for the field. */
      async resolveExerciseName(): Promise<void> {
        const id = store.filters().exerciseId;
        if (!id || store.exerciseName()) return;
        try {
          const exercise = await store._exercises.exercisesControllerDetail({ id });
          patchState(store, { exerciseName: exercise.name });
        } catch {
          patchState(store, { exerciseName: null });
        }
      },

      /** After an edit/delete elsewhere: re-run both queries. */
      async refresh(): Promise<void> {
        const list = store.listRequest();
        const month = store.monthRequest();
        try {
          const [page, monthPage] = await Promise.all([
            list ? store._workouts.workoutsControllerList(list) : null,
            month
              ? store._workouts.workoutsControllerList({
                  ...monthRange(month),
                  status: 'all',
                  page: 1,
                  limit: MONTH_LIMIT,
                })
              : null,
          ]);
          if (page) patchState(store, { items: page.items, total: page.meta.total });
          if (monthPage) patchState(store, { monthWorkouts: monthPage.items });
        } catch {
          // errorInterceptor already reported it.
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      store._loadList(store.listRequest);
      store._loadMonth(store.monthRequest);
      void store.loadRoutines();
    },
  }),
);

export type HistoryStore = InstanceType<typeof HistoryStore>;
