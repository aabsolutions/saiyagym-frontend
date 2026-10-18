import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { ChartTheme } from '../../shared/charts/chart-theme';
import { PlanWindowNote } from '../../shared/charts/plan-window-note';
import { StatRange } from '../../shared/charts/stat-range';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { MAX_MUSCLES, MuscleMetric, muscleVolumeOption, weeksOf } from './stats-charts';
import { StatsStore } from './stats.store';

/** Working sets (or kg) per primary muscle, bars grouped by week. */
@Component({
  selector: 'app-stats-volume-page',
  imports: [
    Chart,
    ChartCard,
    LocalDatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    PlanWindowNote,
    StatRange,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters">
      <app-stat-range [value]="store.range()" (changed)="store.setRange($event)" />
      <mat-button-toggle-group
        hideSingleSelectionIndicator
        [value]="store.muscleMetric()"
        [attr.aria-label]="'stats.volume.metric' | transloco"
        (change)="setMetric($event.value)"
      >
        <mat-button-toggle value="sets">{{ 'stats.volume.sets' | transloco }}</mat-button-toggle>
        <mat-button-toggle value="volume">{{ 'stats.volume.kg' | transloco }}</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    @if (store.rangeLocked() || store.limitedWindow()) {
      <app-plan-window-note class="note" />
    }

    <app-chart-card
      titleKey="stats.volume.title"
      [subtitle]="'stats.volume.subtitle' | transloco"
      [empty]="!rows().length"
      emptyKey="stats.volume.empty"
      [pending]="store.pending().muscles"
    >
      <p class="hint">{{ 'stats.volume.pickHint' | transloco: { max: maxMuscles } }}</p>
      <div class="chips" role="group" [attr.aria-label]="'stats.volume.muscles' | transloco">
        @for (muscle of store.availableMuscles(); track muscle) {
          @let slot = slotOf(muscle);
          <button
            mat-stroked-button
            type="button"
            [attr.aria-pressed]="slot >= 0"
            [disabled]="slot < 0 && !store.canAddMuscle()"
            (click)="store.toggleMuscle(muscle)"
          >
            @if (slot >= 0) {
              <span class="swatch" [style.background]="colors()[slot]"></span>
            }
            {{ 'exercises.muscles.' + muscle | transloco }}
          </button>
        }
      </div>
      <app-chart
        chart
        [options]="options()"
        [height]="320"
        [label]="'stats.volume.aria' | transloco"
      />
      <table table class="sg-table">
        <thead>
          <tr>
            <th scope="col">{{ 'stats.table.week' | transloco }}</th>
            @for (muscle of shownMuscles(); track muscle) {
              <th scope="col" class="num">{{ 'exercises.muscles.' + muscle | transloco }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (week of weeksDesc(); track week) {
            <tr>
              <td>{{ week | localDate }}</td>
              @for (muscle of shownMuscles(); track muscle) {
                @let row = cell(week, muscle);
                <td class="num">
                  @if (store.muscleMetric() === 'sets') {
                    {{ row?.sets ?? 0 }}
                  } @else {
                    {{ row?.volumeKg ?? 0 | weight: { digits: 0 } }}
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </app-chart-card>
  `,
  styleUrl: './stats-page.scss',
})
export class StatsVolumePage {
  protected readonly store = inject(StatsStore);
  private readonly theme = inject(ChartTheme);
  protected readonly maxMuscles = MAX_MUSCLES;

  protected readonly rows = computed(() => this.store.muscleVolume()?.rows ?? []);
  protected readonly colors = computed(() => this.theme.tokens().categorical);
  protected readonly shownMuscles = computed(() =>
    this.store.slots().filter((m): m is string => m !== null),
  );
  protected readonly weeksDesc = computed(() => weeksOf(this.rows()).reverse());
  private readonly cells = computed(
    () => new Map(this.rows().map((r) => [`${r.week}|${r.muscle}`, r])),
  );

  protected readonly options = computed(() =>
    muscleVolumeOption(
      this.theme.context(),
      this.rows(),
      this.store.slots(),
      this.store.muscleMetric(),
    ),
  );

  constructor() {
    this.store.activate('volume');
  }

  protected slotOf(muscle: string): number {
    return this.store.slots().indexOf(muscle);
  }

  protected cell(week: string, muscle: string) {
    return this.cells().get(`${week}|${muscle}`) ?? null;
  }

  protected setMetric(metric: MuscleMetric): void {
    this.store.setMuscleMetric(metric);
  }
}
