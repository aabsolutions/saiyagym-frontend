import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Body metrics and progress photos (Premium). Provided by the feature route, so state dies with the feature. */
export const BodyStore = signalStore(withRequestStatus());

export type BodyStore = InstanceType<typeof BodyStore>;
