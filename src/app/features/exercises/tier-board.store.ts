import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, distinctUntilChanged, from, of, pipe, switchMap, tap } from 'rxjs';
import { ExercisesService } from '../../api/services/exercises.service';
import { AuthStore } from '../../core/auth/auth.store';
import { Muscle, Tier, TierGoal, defaultTierGoal } from '../../shared/exercises/exercise-taxonomy';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { TierBoard, boardFromDto, emptyBoard, moveToTier } from './tier-board';

export type TierSource = 'global' | 'personal';

interface TierBoardState {
  goal: TierGoal | null; // null = not chosen yet → user's default
  muscle: Muscle | null;
  source: TierSource;
  board: TierBoard;
}

export const TierBoardStore = signalStore(
  withState<TierBoardState>({ goal: null, muscle: null, source: 'global', board: emptyBoard() }),
  withRequestStatus(),
  withProps(() => ({ _api: inject(ExercisesService), _auth: inject(AuthStore) })),
  withComputed(({ goal, muscle, source, _auth }) => {
    const effectiveGoal = computed(() => goal() ?? defaultTierGoal(_auth.user()?.profile.goal));
    return {
      effectiveGoal,
      editable: computed(() => source() === 'personal'),
      query: computed(() => ({
        goal: effectiveGoal(),
        source: source(),
        ...(muscle() && { muscle: muscle()! }),
      })),
    };
  }),
  withMethods((store) => {
    const fetchBoard = () =>
      from(store._api.exercisesControllerTierList(store.query())).pipe(
        tap((dto) => patchState(store, { board: boardFromDto(dto) }, setFulfilled())),
        catchError((error: unknown) => {
          patchState(store, setError(error));
          return of(null);
        }),
      );

    return {
      /** Starts loading and keeps the board in sync with goal/muscle/source. */
      connect: rxMethod<ReturnType<typeof store.query>>(
        pipe(
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
          tap(() => patchState(store, setPending())),
          switchMap(() => fetchBoard()),
        ),
      ),

      setGoal: (goal: TierGoal) => patchState(store, { goal }),
      setMuscle: (muscle: Muscle | null) => patchState(store, { muscle }),
      setSource: (source: TierSource) => patchState(store, { source }),

      /**
       * Personal mode only: sets the personal tier for the board's goal (the other goal is
       * untouched). Optimistic; the previous board comes back on error.
       */
      async moveTo(exerciseId: string, tier: Tier): Promise<void> {
        if (!store.editable()) return;
        const goal = store.effectiveGoal();
        const previous = store.board();
        const next = moveToTier(previous, exerciseId, tier, goal);
        if (next === previous) return;
        patchState(store, { board: next });
        try {
          await store._api.exercisesControllerUpdatePrefs({
            id: exerciseId,
            body: { personalTiers: { [goal]: tier } },
          });
        } catch {
          patchState(store, { board: previous });
        }
      },

      /** Back to the global tier for this goal: the API decides where it lands, so reload. */
      async resetPersonalTier(exerciseId: string): Promise<void> {
        try {
          await store._api.exercisesControllerUpdatePrefs({
            id: exerciseId,
            body: { personalTiers: { [store.effectiveGoal()]: null } },
          });
          fetchBoard().subscribe();
        } catch {
          // errorInterceptor already reported it.
        }
      },
    };
  }),
);

export type TierBoardStore = InstanceType<typeof TierBoardStore>;
