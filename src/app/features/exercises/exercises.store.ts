import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Catalog (global + custom), filters and the S/A/B/C tier board. Provided by the feature route, so state dies with the feature. */
export const ExercisesStore = signalStore(withRequestStatus());

export type ExercisesStore = InstanceType<typeof ExercisesStore>;
