import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { BrokenRecordDto } from '../../api/models/broken-record-dto';
import { UpdateWorkoutDto } from '../../api/models/update-workout-dto';
import { WorkoutDetailDto } from '../../api/models/workout-detail-dto';
import { WorkoutsService } from '../../api/services/workouts.service';
import { StatsService } from '../../api/services/stats.service';
import { RecordEntry, RecordType, recordsFromWorkout } from '../../shared/records/exercise-records';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';

export interface SessionRecord {
  exerciseId: string;
  type: RecordType;
  entry: RecordEntry;
}

interface WorkoutDetailState {
  workout: WorkoutDetailDto | null;
  /** Records still standing that were set in this session. */
  records: SessionRecord[];
  saving: boolean;
}

export const WorkoutDetailStore = signalStore(
  withState<WorkoutDetailState>({ workout: null, records: [], saving: false }),
  withRequestStatus(),
  withProps(() => ({ _api: inject(WorkoutsService), _records: inject(StatsService) })),
  withMethods((store) => {
    /**
     * The API keeps only the current records (each with its workoutId), so "PRs of this
     * session" = current records pointing here. One call per distinct exercise, in parallel.
     */
    const loadRecords = async (workout: WorkoutDetailDto) => {
      const exerciseIds = [...new Set(workout.exercises.map((e) => e.exerciseId))];
      const all = await Promise.all(
        exerciseIds.map((id) =>
          store._records.recordsControllerForExercise({ id }).catch(() => null),
        ),
      );
      const records = all.flatMap((r) =>
        r ? recordsFromWorkout(r, workout.id).map((x) => ({ exerciseId: r.exerciseId, ...x })) : [],
      );
      patchState(store, { records });
    };

    return {
      async load(id: string): Promise<void> {
        patchState(store, setPending(), { workout: null, records: [] });
        try {
          const workout = await store._api.workoutsControllerDetail({ id });
          patchState(store, { workout }, setFulfilled());
          await loadRecords(workout);
        } catch (error) {
          patchState(store, setError(error));
        }
      },

      /** Resolves to the records broken by the edit, or null if it failed (error shown). */
      async save(body: UpdateWorkoutDto): Promise<BrokenRecordDto[] | null> {
        const current = store.workout();
        if (!current) return null;
        patchState(store, { saving: true });
        try {
          const saved = await store._api.workoutsControllerUpdate({ id: current.id, body });
          const { newRecords, ...workout } = saved;
          patchState(store, { workout });
          await loadRecords(workout);
          return newRecords;
        } catch {
          return null;
        } finally {
          patchState(store, { saving: false });
        }
      },

      async remove(): Promise<boolean> {
        const id = store.workout()?.id;
        if (!id) return false;
        try {
          await store._api.workoutsControllerRemove({ id });
          return true;
        } catch {
          return false;
        }
      },
    };
  }),
);

export type WorkoutDetailStore = InstanceType<typeof WorkoutDetailStore>;
