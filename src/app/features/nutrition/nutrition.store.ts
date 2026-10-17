import { signalStore } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/store/with-request-status';

/** Static guidance, meal suggestions and calorie calculator. Provided by the feature route, so state dies with the feature. */
export const NutritionStore = signalStore(withRequestStatus());

export type NutritionStore = InstanceType<typeof NutritionStore>;
