import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Routine templates with embedded exercises and target sets. Provided by the feature route, so state dies with the feature. */
export const RoutinesStore = signalStore(withRequestStatus());

export type RoutinesStore = InstanceType<typeof RoutinesStore>;
