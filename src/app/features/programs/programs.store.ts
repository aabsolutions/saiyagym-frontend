import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Programs over weeks, templates and auto-progression (Premium). Provided by the feature route, so state dies with the feature. */
export const ProgramsStore = signalStore(withRequestStatus());

export type ProgramsStore = InstanceType<typeof ProgramsStore>;
