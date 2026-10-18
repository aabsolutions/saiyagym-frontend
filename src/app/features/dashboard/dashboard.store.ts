import { HttpContext } from '@angular/common/http';
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
import { SeriesPointDto } from '../../api/models/series-point-dto';
import { SummaryDto } from '../../api/models/summary-dto';
import { BodyMetricsService } from '../../api/services/body-metrics.service';
import { ProgramsService } from '../../api/services/programs.service';
import { StatsService } from '../../api/services/stats.service';
import { AuthStore } from '../../core/auth/auth.store';
import { apiErrorCode } from '../../core/http/api-error';
import { SKIP_ERROR_NOTIFY } from '../../core/http/api-request';
import { rangeFrom } from '../../shared/charts/stat-range';
import { browserTimeZone, todayIso } from '../../shared/format/local-dates';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { LatestRecord, NextWorkout, findNextWorkout, latestRecords } from './dashboard-model';

export const LATEST_RECORDS = 5;

interface DashboardState {
  summary: SummaryDto | null;
  /** undefined = loading; null = no active program (or it failed: see nextFailed). */
  next: NextWorkout | null | undefined;
  nextFailed: boolean;
  records: LatestRecord[];
  weight: SeriesPointDto[];
}

/** Home overview: each widget loads on its own, so a slow one doesn't hold the rest. */
export const DashboardStore = signalStore(
  withState<DashboardState>({
    summary: null,
    next: undefined,
    nextFailed: false,
    records: [],
    weight: [],
  }),
  withRequestStatus(),
  withProps(() => ({
    _auth: inject(AuthStore),
    _stats: inject(StatsService),
    _programs: inject(ProgramsService),
    _metrics: inject(BodyMetricsService),
  })),
  withComputed(({ _auth, weight }) => ({
    name: computed(() => _auth.user()?.profile.name ?? null),
    planName: computed(() => _auth.plan()?.name ?? null),
    latestWeight: computed(() => weight().at(-1) ?? null),
    /** Change over the shown window (first → last weigh-in). */
    weightDelta: computed(() => {
      const points = weight();
      return points.length > 1 ? points[points.length - 1].value - points[0].value : null;
    }),
  })),
  withMethods((store) => {
    const loadSummary = async () => {
      patchState(store, setPending());
      try {
        const summary = await store._stats.statsControllerSummary({ tz: browserTimeZone() });
        patchState(store, { summary }, setFulfilled());
      } catch (error) {
        patchState(store, setError(error));
      }
    };

    const loadNext = async () => {
      // "No active program" is an answer here, not an error worth a snackbar.
      const context = new HttpContext().set(SKIP_ERROR_NOTIFY, true);
      try {
        const next = await findNextWorkout(
          (date) => store._programs.programsControllerToday({ date }, context),
          todayIso(),
        );
        patchState(store, { next });
      } catch (error) {
        const noProgram = apiErrorCode(error) === 'NO_ACTIVE_PROGRAM';
        patchState(store, { next: null, nextFailed: !noProgram });
      }
    };

    const loadRecords = async () => {
      try {
        const items = await store._stats.recordsControllerList();
        patchState(store, { records: latestRecords(items, LATEST_RECORDS) });
      } catch {
        // The widget shows its empty state.
      }
    };

    const loadWeight = async () => {
      try {
        const series = await store._metrics.bodyMetricsControllerSeries({
          metric: 'weightKg',
          from: rangeFrom('90d'),
        });
        patchState(store, { weight: series.points });
      } catch {
        // The widget shows its empty state.
      }
    };

    return {
      load: () => Promise.all([loadSummary(), loadNext(), loadRecords(), loadWeight()]),
    };
  }),
  withHooks({
    onInit(store) {
      void store.load();
    },
  }),
);

export type DashboardStore = InstanceType<typeof DashboardStore>;
