import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import { AuthStore } from '../../core/auth/auth.store';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Home overview. Stats widgets (GET /stats/summary) land here next. */
export const DashboardStore = signalStore(
  withRequestStatus(),
  withComputed(() => {
    const auth = inject(AuthStore);
    return {
      name: computed(() => auth.user()?.profile.name ?? null),
      planName: computed(() => auth.plan()?.name ?? null),
    };
  }),
);

export type DashboardStore = InstanceType<typeof DashboardStore>;
