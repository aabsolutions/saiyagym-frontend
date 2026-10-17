import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Records, e1RM evolution, muscle volume, frequency, adherence. Provided by the feature route, so state dies with the feature. */
export const StatsStore = signalStore(withRequestStatus());

export type StatsStore = InstanceType<typeof StatsStore>;
