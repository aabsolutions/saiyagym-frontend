import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { PublicPlanDto } from '../../api/models/public-plan-dto';
import { PlansService } from '../../api/services/plans.service';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { buildComparison } from './plan-comparison';

/** Public catalog (GET /plans): admin-editable, so nothing about plans is hard-coded here. */
export const PlansStore = signalStore(
  withState<{ plans: PublicPlanDto[] }>({ plans: [] }),
  withRequestStatus(),
  withProps(() => ({ _plansApi: inject(PlansService) })),
  withComputed(({ plans }) => ({
    comparison: computed(() => buildComparison(plans())),
  })),
  withMethods((store) => ({
    async load(): Promise<void> {
      patchState(store, setPending());
      try {
        // The default (Free) plan first, then as the admin ordered them.
        const plans = await store._plansApi.plansControllerCatalog();
        patchState(
          store,
          { plans: [...plans].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)) },
          setFulfilled(),
        );
      } catch (error) {
        patchState(store, setError(error));
      }
    },
  })),
  withHooks({ onInit: (store) => void store.load() }),
);

export type PlansStore = InstanceType<typeof PlansStore>;
