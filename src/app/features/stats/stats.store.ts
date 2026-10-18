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
import { catchError, distinctUntilChanged, filter, from, of, pipe, switchMap, tap } from 'rxjs';
import { ExerciseStatsDto } from '../../api/models/exercise-stats-dto';
import { FrequencyDto } from '../../api/models/frequency-dto';
import { MuscleVolumeDto } from '../../api/models/muscle-volume-dto';
import { PowerliftingTotalDto } from '../../api/models/powerlifting-total-dto';
import { ProgramAdherenceDto } from '../../api/models/program-adherence-dto';
import { ProgramDto } from '../../api/models/program-dto';
import { RecordEntryDto } from '../../api/models/record-entry-dto';
import { RecordsSummaryItemDto } from '../../api/models/records-summary-item-dto';
import { WindowDto } from '../../api/models/window-dto';
import { ProgramsService } from '../../api/services/programs.service';
import { StatsService } from '../../api/services/stats.service';
import { AuthStore } from '../../core/auth/auth.store';
import {
  DEFAULT_RANGE,
  RangePreset,
  exceedsFreeWindow,
  rangeFrom,
} from '../../shared/charts/stat-range';
import { PickedExercise } from '../../shared/exercises/exercise-autocomplete';
import { browserTimeZone } from '../../shared/format/local-dates';
import {
  MAX_MUSCLES,
  MuscleMetric,
  TotalMetric,
  toggleMuscleSlot,
  topMuscles,
} from './stats-charts';

/** Tabs load their data the first time they are shown, not all at once. */
export type StatsSection = 'progress' | 'volume' | 'consistency' | 'records';
type Pending = Record<'exercise' | 'muscles' | 'frequency' | 'total' | 'adherence', boolean>;

interface StatsState {
  range: RangePreset;
  active: Record<StatsSection, boolean>;
  pending: Pending;

  exercise: PickedExercise | null;
  exerciseStats: ExerciseStatsDto | null;

  muscleVolume: MuscleVolumeDto | null;
  muscleMetric: MuscleMetric;
  /** Slot-stable muscle selection (index = palette slot). null until the user picks. */
  muscleSlots: (string | null)[] | null;

  year: number;
  frequency: FrequencyDto | null;

  totalMetric: TotalMetric;
  total: PowerliftingTotalDto | null;

  programs: ProgramDto[];
  programId: string | null;
  adherence: ProgramAdherenceDto | null;

  records: RecordsSummaryItemDto[];
  recordsLoaded: boolean;
  /** Most reps at each weight, loaded when a records row is expanded. */
  repsAtWeight: Record<string, RecordEntryDto[]>;
}

const json = <T>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

const latestAchievement = (item: RecordsSummaryItemDto): string =>
  [item.maxWeight, item.bestE1RM, item.maxVolume]
    .map((r) => r?.achievedAt ?? '')
    .reduce((a, b) => (a > b ? a : b), '');

/** The exercise the user trained toward a record most recently: a sensible first chart. */
export function defaultExercise(records: RecordsSummaryItemDto[]): PickedExercise | null {
  let best: RecordsSummaryItemDto | null = null;
  for (const item of records)
    if (!best || latestAchievement(item) > latestAchievement(best)) best = item;
  return best ? { id: best.exerciseId, name: best.name ?? '' } : null;
}

export const StatsStore = signalStore(
  withState<StatsState>({
    range: DEFAULT_RANGE,
    active: { progress: false, volume: false, consistency: false, records: false },
    pending: { exercise: false, muscles: false, frequency: false, total: false, adherence: false },
    exercise: null,
    exerciseStats: null,
    muscleVolume: null,
    muscleMetric: 'sets',
    muscleSlots: null,
    year: new Date().getFullYear(),
    frequency: null,
    totalMetric: 'e1rm',
    total: null,
    programs: [],
    programId: null,
    adherence: null,
    records: [],
    recordsLoaded: false,
    repsAtWeight: {},
  }),
  withProps(() => ({
    _stats: inject(StatsService),
    _programs: inject(ProgramsService),
    _auth: inject(AuthStore),
    _tz: browserTimeZone(),
  })),
  withComputed((store) => {
    const rangeStart = computed(() => rangeFrom(store.range()));
    return {
      fullStats: computed(() => store._auth.hasFeature('fullStats')),
      /** Free user asking for more than their window: show the upgrade path. */
      rangeLocked: computed(
        () => !store._auth.hasFeature('fullStats') && exceedsFreeWindow(store.range()),
      ),
      exerciseRequest: computed(() => {
        const exercise = store.exercise();
        return store.active().progress && exercise
          ? { id: exercise.id, tz: store._tz, from: rangeStart() }
          : null;
      }),
      totalRequest: computed(() =>
        store.active().progress
          ? { tz: store._tz, from: rangeStart(), metric: store.totalMetric() }
          : null,
      ),
      muscleRequest: computed(() =>
        store.active().volume ? { tz: store._tz, from: rangeStart() } : null,
      ),
      frequencyRequest: computed(() =>
        store.active().consistency ? { tz: store._tz, year: store.year() } : null,
      ),
      adherenceRequest: computed(() => {
        const programId = store.programId();
        return store.active().consistency && programId ? { programId, tz: store._tz } : null;
      }),
      /** Shown slots: the user's pick, else the top muscles of the loaded range. */
      slots: computed<(string | null)[]>(
        () => store.muscleSlots() ?? topMuscles(store.muscleVolume()?.rows ?? [], 4),
      ),
      availableMuscles: computed(() =>
        topMuscles(store.muscleVolume()?.rows ?? [], Number.MAX_SAFE_INTEGER),
      ),
    };
  }),
  withComputed((store) => ({
    /** The window of any range-based query that the plan clamped. */
    limitedWindow: computed<WindowDto | null>(() => {
      const windows = [
        store.exerciseStats()?.window,
        store.total()?.window,
        store.muscleVolume()?.window,
      ];
      return windows.find((w) => w?.limitedByPlan) ?? null;
    }),
    canAddMuscle: computed(() => store.slots().filter((m) => m !== null).length < MAX_MUSCLES),
  })),
  withMethods((store) => {
    const setPending = (key: keyof Pending, value: boolean) =>
      patchState(store, (s) => ({ pending: { ...s.pending, [key]: value } }));

    /** Request signal → latest response (switchMap cancels a stale one). */
    const query = <R, T>(
      key: keyof Pending,
      fetch: (request: R) => Promise<T>,
      apply: (data: T) => void,
    ) =>
      rxMethod<R | null>(
        pipe(
          filter((r): r is R => r !== null),
          distinctUntilChanged(json),
          tap(() => setPending(key, true)),
          switchMap((request) =>
            from(fetch(request)).pipe(
              tap((data) => {
                apply(data);
                setPending(key, false);
              }),
              catchError(() => {
                // errorInterceptor already told the user; keep the previous render.
                setPending(key, false);
                return of(null);
              }),
            ),
          ),
        ),
      );

    /** Active first, then the rest; the active one is preselected. */
    const loadPrograms = async (): Promise<void> => {
      try {
        const programs = (await store._programs.programsControllerList()).filter(
          (p) => p.status !== 'draft',
        );
        programs.sort(
          (a, b) =>
            Number(b.status === 'active') - Number(a.status === 'active') ||
            (b.activatedAt ?? '').localeCompare(a.activatedAt ?? ''),
        );
        patchState(store, { programs });
        if (!store.programId() && programs.length) patchState(store, { programId: programs[0].id });
      } catch {
        // No selector: the adherence card explains there is nothing to show.
      }
    };

    return {
      _loadExercise: query(
        'exercise',
        (r: NonNullable<ReturnType<typeof store.exerciseRequest>>) =>
          store._stats.statsControllerExercise(r),
        (exerciseStats) => patchState(store, { exerciseStats }),
      ),
      _loadTotal: query(
        'total',
        (r: NonNullable<ReturnType<typeof store.totalRequest>>) =>
          store._stats.statsControllerPowerliftingTotal(r),
        (total) => patchState(store, { total }),
      ),
      _loadMuscles: query(
        'muscles',
        (r: NonNullable<ReturnType<typeof store.muscleRequest>>) =>
          store._stats.statsControllerMuscleVolume(r),
        (muscleVolume) => patchState(store, { muscleVolume }),
      ),
      _loadFrequency: query(
        'frequency',
        (r: NonNullable<ReturnType<typeof store.frequencyRequest>>) =>
          store._stats.statsControllerFrequency(r),
        (frequency) => patchState(store, { frequency }),
      ),
      _loadAdherence: query(
        'adherence',
        (r: NonNullable<ReturnType<typeof store.adherenceRequest>>) =>
          store._stats.statsControllerProgramAdherence(r),
        (adherence) => patchState(store, { adherence }),
      ),

      activate(section: StatsSection): void {
        if (store.active()[section]) return;
        patchState(store, (s) => ({ active: { ...s.active, [section]: true } }));
        if (section === 'consistency') void loadPrograms();
      },

      setRange: (range: RangePreset) => patchState(store, { range }),
      setExercise: (exercise: PickedExercise | null) =>
        patchState(store, { exercise, ...(!exercise && { exerciseStats: null }) }),
      setMuscleMetric: (muscleMetric: MuscleMetric) => patchState(store, { muscleMetric }),
      toggleMuscle: (muscle: string) =>
        patchState(store, { muscleSlots: toggleMuscleSlot(store.slots(), muscle) }),
      setYear: (year: number) => patchState(store, { year }),
      setTotalMetric: (totalMetric: TotalMetric) => patchState(store, { totalMetric }),
      setProgram: (programId: string | null) =>
        patchState(store, { programId, ...(!programId && { adherence: null }) }),

      async loadRecords(): Promise<void> {
        if (store.recordsLoaded()) return;
        try {
          const records = await store._stats.recordsControllerList();
          patchState(store, { records, recordsLoaded: true });
          if (!store.exercise()) patchState(store, { exercise: defaultExercise(records) });
        } catch {
          patchState(store, { recordsLoaded: true });
        }
      },

      async loadRepsAtWeight(exerciseId: string): Promise<void> {
        if (store.repsAtWeight()[exerciseId]) return;
        try {
          const detail = await store._stats.recordsControllerForExercise({ id: exerciseId });
          patchState(store, (s) => ({
            repsAtWeight: { ...s.repsAtWeight, [exerciseId]: detail.repsAtWeight },
          }));
        } catch {
          // The row just stays without the breakdown.
        }
      },

      loadPrograms,
    };
  }),
  withHooks({
    onInit(store) {
      store._loadExercise(store.exerciseRequest);
      store._loadTotal(store.totalRequest);
      store._loadMuscles(store.muscleRequest);
      store._loadFrequency(store.frequencyRequest);
      store._loadAdherence(store.adherenceRequest);
      void store.loadRecords();
    },
  }),
);

export type StatsStore = InstanceType<typeof StatsStore>;
