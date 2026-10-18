import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { patchState, signalStore, withMethods, withProps } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { ChangePasswordDto } from '../../api/models/change-password-dto';
import { UpdatePreferencesDto } from '../../api/models/update-preferences-dto';
import { UpdateProfileDto } from '../../api/models/update-profile-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';

/**
 * The user lives in AuthStore (global); this store owns the profile page's save flows.
 * Every method resolves to whether it succeeded; errors were already shown by the
 * error interceptor.
 */
export const ProfileStore = signalStore(
  withRequestStatus(),
  withProps(() => ({
    _auth: inject(AuthStore),
    _notifier: inject(Notifier),
    _dialog: inject(MatDialog),
  })),
  withMethods((store) => {
    const run = async (task: () => Promise<void>, successKey?: string): Promise<boolean> => {
      patchState(store, setPending());
      try {
        await task();
        patchState(store, setFulfilled());
        if (successKey) store._notifier.info(successKey);
        return true;
      } catch (error) {
        patchState(store, setError(error));
        return false;
      }
    };

    const confirm = (data: ConfirmDialogData): Promise<boolean> =>
      firstValueFrom(store._dialog.open(ConfirmDialog, { data }).afterClosed()).then(
        (result) => result === true,
      );

    return {
      saveProfile: (profile: UpdateProfileDto) =>
        run(() => store._auth.updateMe({ profile }), 'common.saved'),

      savePreferences: (preferences: UpdatePreferencesDto) =>
        run(() => store._auth.updateMe({ preferences }), 'common.saved'),

      changePassword: (dto: ChangePasswordDto) =>
        run(() => store._auth.changePassword(dto), 'profile.security.passwordChanged'),

      async logoutAll(): Promise<void> {
        const confirmed = await confirm({
          title: 'profile.security.logoutAllTitle',
          message: 'profile.security.logoutAllMessage',
          confirm: 'profile.security.logoutAll',
        });
        if (confirmed) await run(() => store._auth.logoutAll());
      },

      deleteAccount: (password: string) =>
        run(() => store._auth.deleteAccount(password), 'profile.danger.deleted'),
    };
  }),
);

export type ProfileStore = InstanceType<typeof ProfileStore>;
