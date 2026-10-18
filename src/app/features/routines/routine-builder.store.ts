import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { RoutineDetailDto } from '../../api/models/routine-detail-dto';
import { RoutineExerciseDto } from '../../api/models/routine-exercise-dto';
import { RoutinesService } from '../../api/services/routines.service';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';

/**
 * Load/save of one routine. The draft itself lives in the builder page as a writable signal
 * (Signal Forms needs one); this store only talks to the API.
 */
export const RoutineBuilderStore = signalStore(
  withState<{ saving: boolean }>({ saving: false }),
  withRequestStatus(),
  withProps(() => ({ _api: inject(RoutinesService) })),
  withMethods((store) => ({
    async load(id: string): Promise<RoutineDetailDto | null> {
      patchState(store, setPending());
      try {
        const routine = await store._api.routinesControllerDetail({ id });
        patchState(store, setFulfilled());
        return routine;
      } catch (error) {
        patchState(store, setError(error));
        return null;
      }
    },

    /** Create when `id` is null. Resolves to the saved routine, or null (error shown). */
    async save(
      id: string | null,
      body: { name: string; notes: string; exercises: RoutineExerciseDto[] },
    ): Promise<RoutineDetailDto | null> {
      patchState(store, { saving: true });
      try {
        return id
          ? await store._api.routinesControllerUpdate({ id, body })
          : await store._api.routinesControllerCreate({ body });
      } catch {
        return null;
      } finally {
        patchState(store, { saving: false });
      }
    },
  })),
);

export type RoutineBuilderStore = InstanceType<typeof RoutineBuilderStore>;
