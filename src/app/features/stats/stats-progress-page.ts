import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslocoPipe } from '@jsverse/transloco';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { ChartTheme } from '../../shared/charts/chart-theme';
import { PlanWindowNote } from '../../shared/charts/plan-window-note';
import { StatRange } from '../../shared/charts/stat-range';
import { ExerciseAutocomplete } from '../../shared/exercises/exercise-autocomplete';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { WeightPipe } from '../../shared/units/weight.pipe';
import {
  TotalMetric,
  exerciseStrengthOption,
  exerciseVolumeOption,
  powerliftingOption,
} from './stats-charts';
import { StatsStore } from './stats.store';

/** Per-exercise evolution (max weight, e1RM, volume) and the powerlifting total. */
@Component({
  selector: 'app-stats-progress-page',
  imports: [
    Chart,
    ChartCard,
    ExerciseAutocomplete,
    LocalDatePipe,
    MatButtonToggleModule,
    PlanWindowNote,
    StatRange,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats-progress-page.html',
  styleUrl: './stats-page.scss',
})
export class StatsProgressPage {
  protected readonly store = inject(StatsStore);
  private readonly theme = inject(ChartTheme);

  protected readonly points = computed(() => this.store.exerciseStats()?.points ?? []);
  /** Newest first in the table; the chart reads left to right. */
  protected readonly pointsDesc = computed(() => this.points().slice().reverse());
  protected readonly totalPoints = computed(() => this.store.total()?.points ?? []);
  protected readonly totalDesc = computed(() => this.totalPoints().slice().reverse());

  protected readonly strengthOptions = computed(() =>
    exerciseStrengthOption(this.theme.context(), this.points()),
  );
  protected readonly volumeOptions = computed(() =>
    exerciseVolumeOption(this.theme.context(), this.points()),
  );
  protected readonly totalOptions = computed(() =>
    powerliftingOption(this.theme.context(), this.totalPoints()),
  );

  constructor() {
    this.store.activate('progress');
  }

  protected setTotalMetric(metric: TotalMetric): void {
    this.store.setTotalMetric(metric);
  }
}
