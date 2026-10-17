import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Logged workouts (recorded on mobile; viewed and edited here). Provided by the feature route, so state dies with the feature. */
export const HistoryStore = signalStore(withRequestStatus());

export type HistoryStore = InstanceType<typeof HistoryStore>;
