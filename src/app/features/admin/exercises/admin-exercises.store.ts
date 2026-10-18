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
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  from,
  of,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { AdminExerciseDto } from '../../../api/models/admin-exercise-dto';
import { AdminExercisesService } from '../../../api/services/admin-exercises.service';
import { Notifier } from '../../../core/notify/notifier';
import { Muscle } from '../../../shared/exercises/exercise-taxonomy';

export const ADMIN_EXERCISES_PAGE_SIZE = 25;

interface AdminExercisesState {
  q: string;
  muscle: Muscle | null;
  page: number;
  items: AdminExerciseDto[];
  total: number;
  pending: boolean;
  /** Bumped after a delete so the same request refetches. */
  revision: number;
}

/** The global catalog (custom exercises are the users' business, not listed here). */
export const AdminExercisesStore = signalStore(
  withState<AdminExercisesState>({
    q: '',
    muscle: null,
    page: 1,
    items: [],
    total: 0,
    pending: false,
    revision: 0,
  }),
  withProps(() => ({ _api: inject(AdminExercisesService), _notifier: inject(Notifier) })),
  withComputed(({ q, muscle, page, revision }) => ({
    request: computed(() => ({
      page: page(),
      limit: ADMIN_EXERCISES_PAGE_SIZE,
      sort: (q().trim() ? 'relevance' : 'name') as 'relevance' | 'name',
      custom: false,
      ...(q().trim() && { q: q().trim() }),
      ...(muscle() && { muscle: muscle()! }),
      revision: revision(),
    })),
  })),
  withMethods((store) => ({
    _load: rxMethod<ReturnType<typeof store.request>>(
      pipe(
        debounceTime(250),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(() => patchState(store, { pending: true })),
        switchMap(({ revision: _revision, ...request }) =>
          from(store._api.adminExercisesControllerList(request)).pipe(
            tap((page) =>
              patchState(store, { items: page.items, total: page.meta.total, pending: false }),
            ),
            catchError(() => {
              patchState(store, { pending: false });
              return of(null);
            }),
          ),
        ),
      ),
    ),

    setQuery: (q: string) => patchState(store, { q, page: 1 }),
    setMuscle: (muscle: Muscle | null) => patchState(store, { muscle, page: 1 }),
    setPage: (page: number) => patchState(store, { page }),

    async remove(exercise: AdminExerciseDto): Promise<void> {
      try {
        await store._api.adminExercisesControllerRemove({ id: exercise.id });
        store._notifier.info('admin.deleted');
        patchState(store, (s) => ({ revision: s.revision + 1 }));
      } catch {
        // errorInterceptor already reported it.
      }
    },
  })),
  withHooks({
    onInit(store) {
      store._load(store.request);
    },
  }),
);

export type AdminExercisesStore = InstanceType<typeof AdminExercisesStore>;
