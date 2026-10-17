import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps } from '@ngrx/signals';
import { UpdateProfileDto } from '../../api/models/update-profile-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';

/** The user lives in AuthStore (global); this store owns the save flow of the profile page. */
export const ProfileStore = signalStore(
  withRequestStatus(),
  withProps(() => ({ _auth: inject(AuthStore), _notifier: inject(Notifier) })),
  withMethods((store) => ({
    async saveProfile(profile: UpdateProfileDto): Promise<void> {
      patchState(store, setPending());
      try {
        await store._auth.updateMe({ profile });
        patchState(store, setFulfilled());
        store._notifier.info('common.saved');
      } catch (error) {
        patchState(store, setError(error));
      }
    },
  })),
);

export type ProfileStore = InstanceType<typeof ProfileStore>;
