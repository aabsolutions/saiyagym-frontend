import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { TodayDto } from '../../api/models/today-dto';
import { ProgramsService } from '../../api/services/programs.service';
import { AuthStore } from '../../core/auth/auth.store';
import { addDaysIso, todayIso, weekDatesIso } from '../../shared/format/local-dates';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';

interface WeekState {
  /** Any local date inside the shown week. */
  anchor: string;
  programId: string | null;
  days: TodayDto[];
}

/**
 * "This week" of an active program. The API answers one local date at a time (with targets
 * already computed by the progression rules), so a week is 7 parallel calls.
 */
export const WeekStore = signalStore(
  withState<WeekState>({ anchor: todayIso(), programId: null, days: [] }),
  withRequestStatus(),
  withProps(() => ({ _api: inject(ProgramsService), _auth: inject(AuthStore) })),
  withComputed(({ anchor, _auth }) => ({
    today: computed(() => todayIso()),
    dates: computed(() => weekDatesIso(anchor(), _auth.user()?.preferences.firstDayOfWeek ?? 1)),
  })),
  withMethods((store) => {
    const load = async (): Promise<void> => {
      const programId = store.programId();
      if (!programId) return;
      patchState(store, setPending());
      try {
        const days = await Promise.all(
          store.dates().map((date) => store._api.programsControllerToday({ date, programId })),
        );
        patchState(store, { days }, setFulfilled());
      } catch (error) {
        patchState(store, setError(error));
      }
    };

    return {
      load,
      show(programId: string): Promise<void> {
        patchState(store, { programId });
        return load();
      },
      shiftWeek(weeks: number): Promise<void> {
        patchState(store, { anchor: addDaysIso(store.anchor(), weeks * 7) });
        return load();
      },
      thisWeek(): Promise<void> {
        patchState(store, { anchor: todayIso() });
        return load();
      },
    };
  }),
);

export type WeekStore = InstanceType<typeof WeekStore>;
