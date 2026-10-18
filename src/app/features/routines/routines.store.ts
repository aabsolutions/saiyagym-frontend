import { computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { RoutineSummaryDto } from '../../api/models/routine-summary-dto';
import { RoutinesService } from '../../api/services/routines.service';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';

export type RoutineView = 'active' | 'archived';

/** Max routines listed; the plan limit keeps Free far below it. */
const LIST_LIMIT = 100;

interface RoutinesState {
  view: RoutineView;
  items: RoutineSummaryDto[];
  /** Active (non-archived) routines: what the plan limit counts. */
  activeCount: number | null;
}

export const RoutinesStore = signalStore(
  withState<RoutinesState>({ view: 'active', items: [], activeCount: null }),
  withRequestStatus(),
  withProps(() => ({
    _api: inject(RoutinesService),
    _auth: inject(AuthStore),
    _dialog: inject(MatDialog),
    _notifier: inject(Notifier),
  })),
  withComputed(({ activeCount, _auth }) => ({
    limit: computed(() => _auth.limit('routines')),
    /** UI hint only; the API answers PLAN_LIMIT_REACHED (→ upgrade dialog) anyway. */
    canCreate: computed(() => {
      const max = _auth.limit('routines');
      const count = activeCount();
      return max === null || count === null || count < max;
    }),
  })),
  withMethods((store) => {
    const load = async (): Promise<void> => {
      patchState(store, setPending());
      try {
        const page = await store._api.routinesControllerList({
          archived: store.view() === 'archived' ? 'true' : 'false',
          page: 1,
          limit: LIST_LIMIT,
        });
        patchState(store, { items: page.items }, setFulfilled());
        if (store.view() === 'active') patchState(store, { activeCount: page.meta.total });
      } catch (error) {
        patchState(store, setError(error));
      }
    };

    const countActive = async (): Promise<void> => {
      try {
        const page = await store._api.routinesControllerList({
          archived: 'false',
          page: 1,
          limit: 1,
        });
        patchState(store, { activeCount: page.meta.total });
      } catch {
        // Unknown count: the API still enforces the limit.
      }
    };

    /** Runs an action and refreshes; errors were already shown by the interceptor. */
    const act = async (action: () => Promise<unknown>, successKey: string) => {
      try {
        await action();
        store._notifier.info(successKey);
      } catch {
        return;
      }
      await Promise.all([load(), countActive()]);
    };

    return {
      load,

      setView(view: RoutineView): Promise<void> {
        patchState(store, { view });
        return load();
      },

      duplicate: (r: RoutineSummaryDto) =>
        act(() => store._api.routinesControllerDuplicate({ id: r.id }), 'routines.list.duplicated'),

      archive: (r: RoutineSummaryDto) =>
        act(() => store._api.routinesControllerArchive({ id: r.id }), 'routines.list.archived'),

      unarchive: (r: RoutineSummaryDto) =>
        act(() => store._api.routinesControllerUnarchive({ id: r.id }), 'routines.list.unarchived'),

      /** 409 ROUTINE_IN_USE (used by a draft/active program) is explained by the snackbar. */
      async remove(r: RoutineSummaryDto): Promise<void> {
        const confirmed = await firstValueFrom(
          store._dialog
            .open(ConfirmDialog, {
              data: {
                title: 'routines.list.deleteTitle',
                message: 'routines.list.deleteMessage',
                confirm: 'routines.list.delete',
                danger: true,
              },
            })
            .afterClosed(),
        );
        if (confirmed === true) {
          await act(
            () => store._api.routinesControllerRemove({ id: r.id }),
            'routines.list.deleted',
          );
        }
      },
    };
  }),
  withHooks({
    onInit: (store) => void store.load(),
  }),
);

export type RoutinesStore = InstanceType<typeof RoutinesStore>;
