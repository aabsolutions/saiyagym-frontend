import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';

export type RequestStatus = 'idle' | 'pending' | 'fulfilled' | { error: unknown };

/** Shared by every feature store: one `requestStatus` instead of ad-hoc loading/error flags. */
export function withRequestStatus() {
  return signalStoreFeature(
    withState<{ requestStatus: RequestStatus }>({ requestStatus: 'idle' }),
    withComputed(({ requestStatus }) => ({
      isPending: computed(() => requestStatus() === 'pending'),
      isFulfilled: computed(() => requestStatus() === 'fulfilled'),
      error: computed(() => {
        const status = requestStatus();
        return typeof status === 'object' ? status.error : null;
      }),
    })),
  );
}

export const setPending = (): { requestStatus: RequestStatus } => ({ requestStatus: 'pending' });
export const setFulfilled = (): { requestStatus: RequestStatus } => ({
  requestStatus: 'fulfilled',
});
export const setError = (error: unknown): { requestStatus: RequestStatus } => ({
  requestStatus: { error },
});
