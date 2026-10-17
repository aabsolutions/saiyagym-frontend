import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Catalog, tiers, nutrition base, plans and users. Provided by the feature route, so state dies with the feature. */
export const AdminStore = signalStore(withRequestStatus());

export type AdminStore = InstanceType<typeof AdminStore>;
