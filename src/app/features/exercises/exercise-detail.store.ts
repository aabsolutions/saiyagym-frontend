import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { ExerciseDetailDto } from '../../api/models/exercise-detail-dto';
import { ExercisePerformanceDto } from '../../api/models/exercise-performance-dto';
import { UpdateExercisePrefsDto } from '../../api/models/update-exercise-prefs-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { Tier, TierGoal } from '../../shared/exercises/exercise-taxonomy';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { ExerciseRecords, ExerciseRecordsApi } from '../../shared/records/exercise-records';

export const HISTORY_PAGE_SIZE = 10;

interface ExerciseDetailState {
  exercise: ExerciseDetailDto | null;
  records: ExerciseRecords | null;
  history: ExercisePerformanceDto[];
  historyTotal: number;
  historyPage: number;
  historyLoading: boolean;
}

export const ExerciseDetailStore = signalStore(
  withState<ExerciseDetailState>({
    exercise: null,
    records: null,
    history: [],
    historyTotal: 0,
    historyPage: 1,
    historyLoading: false,
  }),
  withRequestStatus(),
  withProps(() => ({ _api: inject(ExercisesService), _records: inject(ExerciseRecordsApi) })),
  withMethods((store) => {
    const loadRecords = async (id: string) => {
      try {
        patchState(store, { records: await store._records.get(id) });
      } catch {
        patchState(store, { records: null });
      }
    };

    const loadHistory = async (id: string, page: number) => {
      patchState(store, { historyLoading: true });
      try {
        const result = await store._api.exercisePerformanceControllerHistory({
          id,
          page,
          limit: HISTORY_PAGE_SIZE,
        });
        patchState(store, {
          history: result.items,
          historyTotal: result.meta.total,
          historyPage: page,
        });
      } catch {
        patchState(store, { history: [], historyTotal: 0 });
      } finally {
        patchState(store, { historyLoading: false });
      }
    };

    /** Optimistic: `optimistic` is applied now, the API's answer replaces it, error reverts. */
    const patchPrefs = async (
      body: UpdateExercisePrefsDto,
      optimistic: (e: ExerciseDetailDto) => ExerciseDetailDto,
    ) => {
      const exercise = store.exercise();
      if (!exercise) return;
      patchState(store, { exercise: optimistic(exercise) });
      try {
        const prefs = await store._api.exercisesControllerUpdatePrefs({ id: exercise.id, body });
        patchState(store, (s) => ({
          exercise: s.exercise && {
            ...s.exercise,
            isFavorite: prefs.isFavorite,
            personalTiers: prefs.personalTiers,
          },
        }));
      } catch {
        patchState(store, { exercise });
      }
    };

    return {
      async load(id: string): Promise<void> {
        patchState(store, setPending(), { exercise: null, records: null, history: [] });
        try {
          const exercise = await store._api.exercisesControllerDetail({ id });
          patchState(store, { exercise }, setFulfilled());
        } catch (error) {
          patchState(store, setError(error));
          return;
        }
        // History and records are "if they exist": failures just leave them empty.
        await Promise.all([loadRecords(id), loadHistory(id, 1)]);
      },

      historyPageChange(page: number): Promise<void> {
        const id = store.exercise()?.id;
        return id ? loadHistory(id, page) : Promise.resolve();
      },

      toggleFavorite: () => {
        const isFavorite = !store.exercise()?.isFavorite;
        return patchPrefs({ isFavorite }, (e) => ({ ...e, isFavorite }));
      },

      /** Per goal; `null` = back to the global tier for that goal. */
      setPersonalTier: (goal: TierGoal, tier: Tier | null) =>
        patchPrefs({ personalTiers: { [goal]: tier } }, (e) => ({
          ...e,
          personalTiers: { ...e.personalTiers, [goal]: tier },
        })),

      /** Custom exercises only. Resolves to whether it was deleted. */
      async remove(): Promise<boolean> {
        const id = store.exercise()?.id;
        if (!id) return false;
        try {
          await store._api.exercisesControllerRemove({ id });
          return true;
        } catch {
          return false;
        }
      },
    };
  }),
);

export type ExerciseDetailStore = InstanceType<typeof ExerciseDetailStore>;
