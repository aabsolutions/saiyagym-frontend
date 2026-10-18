import { computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { ProgramDto } from '../../api/models/program-dto';
import { ProgramsService } from '../../api/services/programs.service';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';

/** The user's programs (all states). Feature-wide: list, wizard and week view share it. */
export const ProgramsStore = signalStore(
  withState<{ programs: ProgramDto[]; loaded: boolean }>({ programs: [], loaded: false }),
  withRequestStatus(),
  withProps(() => ({
    _api: inject(ProgramsService),
    _auth: inject(AuthStore),
    _dialog: inject(MatDialog),
    _notifier: inject(Notifier),
  })),
  withComputed(({ programs, _auth }) => {
    const active = computed(() => programs().filter((p) => p.status === 'active'));
    return {
      active,
      activeLimit: computed(() => _auth.limit('activePrograms')),
      /** UI hint only; the API answers PLAN_LIMIT_REACHED (→ upgrade dialog) anyway. */
      canActivate: computed(() => {
        const max = _auth.limit('activePrograms');
        return max === null || active().length < max;
      }),
    };
  }),
  withMethods((store) => {
    const load = async (): Promise<void> => {
      patchState(store, setPending());
      try {
        const programs = await store._api.programsControllerList({});
        // Active first, then drafts, then completed; newest first within each.
        const rank = { active: 0, draft: 1, completed: 2 } as const;
        programs.sort(
          (a, b) => rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt),
        );
        patchState(store, { programs, loaded: true }, setFulfilled());
      } catch (error) {
        patchState(store, setError(error));
      }
    };

    const confirm = (data: ConfirmDialogData) =>
      firstValueFrom(store._dialog.open(ConfirmDialog, { data }).afterClosed()).then(
        (r) => r === true,
      );

    const act = async (action: () => Promise<unknown>, successKey: string): Promise<boolean> => {
      try {
        await action();
      } catch {
        return false; // errorInterceptor (or the upgrade dialog) already explained it
      }
      store._notifier.info(successKey);
      await load();
      return true;
    };

    return {
      load,
      /** Loads once per feature visit. */
      ensureLoaded: () => (store.loaded() ? Promise.resolve() : load()),

      /** `startDate`: the user's LOCAL date of day 1. */
      activate: (p: ProgramDto, startDate: string) =>
        act(
          () => store._api.programsControllerActivate({ id: p.id, body: { startDate } }),
          'programs.list.activated',
        ),

      deactivate: (p: ProgramDto) =>
        act(
          () => store._api.programsControllerDeactivate({ id: p.id }),
          'programs.list.deactivated',
        ),

      async complete(p: ProgramDto): Promise<void> {
        const ok = await confirm({
          title: 'programs.list.completeTitle',
          message: 'programs.list.completeMessage',
          confirm: 'programs.list.complete',
        });
        if (ok)
          await act(
            () => store._api.programsControllerComplete({ id: p.id }),
            'programs.list.completed',
          );
      },

      async remove(p: ProgramDto): Promise<void> {
        const ok = await confirm({
          title: 'programs.list.deleteTitle',
          message: 'programs.list.deleteMessage',
          confirm: 'programs.list.delete',
          danger: true,
        });
        if (ok)
          await act(
            () => store._api.programsControllerRemove({ id: p.id }),
            'programs.list.deleted',
          );
      },
    };
  }),
);

export type ProgramsStore = InstanceType<typeof ProgramsStore>;
