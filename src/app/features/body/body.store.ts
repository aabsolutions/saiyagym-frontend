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
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, distinctUntilChanged, from, of, pipe, switchMap, tap } from 'rxjs';
import { BodyMetricDto } from '../../api/models/body-metric-dto';
import { BodyMetricSeriesDto } from '../../api/models/body-metric-series-dto';
import { CreateBodyMetricDto } from '../../api/models/create-body-metric-dto';
import { UpdateBodyMetricDto } from '../../api/models/update-body-metric-dto';
import { BodyMetricsService } from '../../api/services/body-metrics.service';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import {
  DEFAULT_RANGE,
  RangePreset,
  exceedsFreeWindow,
  rangeFrom,
} from '../../shared/charts/stat-range';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { MeasurementField } from './measurements-model';

export const MEASUREMENTS_PAGE_SIZE = 10;

interface BodyState {
  page: number;
  items: BodyMetricDto[];
  total: number;
  field: MeasurementField;
  range: RangePreset;
  series: BodyMetricSeriesDto | null;
  seriesPending: boolean;
  saving: boolean;
  /** Bumped after every write so the chart refetches even with the same request. */
  revision: number;
}

/** Body measurements: paginated table + one series at a time. */
export const BodyStore = signalStore(
  withState<BodyState>({
    page: 1,
    items: [],
    total: 0,
    field: 'weightKg',
    range: DEFAULT_RANGE,
    series: null,
    seriesPending: false,
    saving: false,
    revision: 0,
  }),
  withRequestStatus(),
  withProps(() => ({
    _api: inject(BodyMetricsService),
    _auth: inject(AuthStore),
    _notifier: inject(Notifier),
  })),
  withComputed((store) => ({
    seriesRequest: computed(() => ({
      metric: store.field(),
      from: rangeFrom(store.range()),
      revision: store.revision(),
    })),
    rangeLocked: computed(
      () => !store._auth.hasFeature('fullStats') && exceedsFreeWindow(store.range()),
    ),
  })),
  withMethods((store) => {
    const loadPage = async (page = store.page()): Promise<void> => {
      patchState(store, setPending(), { page });
      try {
        const result = await store._api.bodyMetricsControllerList({
          page,
          limit: MEASUREMENTS_PAGE_SIZE,
        });
        // Deleting the last row of the last page: step back.
        if (!result.items.length && page > 1) return loadPage(page - 1);
        patchState(store, { items: result.items, total: result.meta.total }, setFulfilled());
      } catch (error) {
        patchState(store, setError(error));
      }
    };

    const afterWrite = async (messageKey: string) => {
      store._notifier.info(messageKey);
      patchState(store, (s) => ({ revision: s.revision + 1 }));
      await loadPage();
    };

    return {
      loadPage,

      _loadSeries: rxMethod<ReturnType<typeof store.seriesRequest>>(
        pipe(
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
          tap(() => patchState(store, { seriesPending: true })),
          switchMap(({ metric, from: start }) =>
            from(store._api.bodyMetricsControllerSeries({ metric, from: start })).pipe(
              tap((series) => patchState(store, { series, seriesPending: false })),
              catchError(() => {
                patchState(store, { seriesPending: false });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      setField: (field: MeasurementField) => patchState(store, { field }),
      setRange: (range: RangePreset) => patchState(store, { range }),

      async create(dto: CreateBodyMetricDto): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          await store._api.bodyMetricsControllerCreate({ body: dto });
          await afterWrite('body.saved');
          return true;
        } catch {
          return false;
        } finally {
          patchState(store, { saving: false });
        }
      },

      async update(id: string, dto: UpdateBodyMetricDto): Promise<boolean> {
        if (!Object.keys(dto).length) return true;
        patchState(store, { saving: true });
        try {
          await store._api.bodyMetricsControllerUpdate({ id, body: dto });
          await afterWrite('body.saved');
          return true;
        } catch {
          return false;
        } finally {
          patchState(store, { saving: false });
        }
      },

      async remove(id: string): Promise<void> {
        try {
          await store._api.bodyMetricsControllerRemove({ id });
          await afterWrite('body.deleted');
        } catch {
          // errorInterceptor already reported it.
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      store._loadSeries(store.seriesRequest);
      void store.loadPage(1);
    },
  }),
);

export type BodyStore = InstanceType<typeof BodyStore>;
