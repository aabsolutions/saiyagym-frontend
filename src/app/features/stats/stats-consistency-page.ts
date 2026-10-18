import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { ChartTheme } from '../../shared/charts/chart-theme';
import { PlanWindowNote } from '../../shared/charts/plan-window-note';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { adherenceOption, frequencyHeatmapOption } from './stats-charts';
import { StatsStore } from './stats.store';

/** Yearly training heatmap and how well a program's schedule was followed. */
@Component({
  selector: 'app-stats-consistency-page',
  imports: [
    Chart,
    ChartCard,
    LocalDatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    PlanWindowNote,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.frequency()?.window?.limitedByPlan) {
      <app-plan-window-note class="note" />
    }

    <div class="grid">
      <app-chart-card
        class="wide"
        titleKey="stats.frequency.title"
        [subtitle]="
          'stats.frequency.subtitle' | transloco: { days: trainedDays(), year: store.year() }
        "
        [empty]="false"
        [pending]="store.pending().frequency"
      >
        <div tools class="year">
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'stats.frequency.prevYear' | transloco"
            (click)="store.setYear(store.year() - 1)"
          >
            <mat-icon>chevron_left</mat-icon>
          </button>
          <span class="year-label">{{ store.year() }}</span>
          <button
            mat-icon-button
            type="button"
            [disabled]="store.year() >= currentYear"
            [attr.aria-label]="'stats.frequency.nextYear' | transloco"
            (click)="store.setYear(store.year() + 1)"
          >
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
        <div chart class="heatmap-scroll">
          <div class="heatmap">
            @if (heatmapOptions(); as options) {
              <app-chart
                [options]="options"
                [height]="160"
                [label]="'stats.frequency.aria' | transloco: { year: store.year() }"
              />
            }
          </div>
          <p class="legend">
            <span>{{ 'stats.frequency.less' | transloco }}</span>
            @for (color of ramp(); track color) {
              <span class="cell" [style.background]="color"></span>
            }
            <span>{{ 'stats.frequency.more' | transloco }}</span>
          </p>
        </div>
        <table table class="sg-table">
          <thead>
            <tr>
              <th scope="col">{{ 'stats.table.week' | transloco }}</th>
              <th scope="col" class="num">{{ 'stats.frequency.daysTrained' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            @for (w of weeksDesc(); track w.weekStart) {
              <tr>
                <td>{{ w.weekStart | localDate }}</td>
                <td class="num">{{ w.daysTrained }}</td>
              </tr>
            }
          </tbody>
        </table>
      </app-chart-card>

      <app-chart-card
        class="wide"
        titleKey="stats.adherence.title"
        [empty]="!adherenceWeeks().length"
        [emptyKey]="
          store.programs().length ? 'stats.adherence.empty' : 'stats.adherence.noPrograms'
        "
        [pending]="store.pending().adherence"
      >
        @if (store.programs().length) {
          <mat-form-field tools class="select" subscriptSizing="dynamic">
            <mat-label>{{ 'stats.adherence.program' | transloco }}</mat-label>
            <mat-select [value]="store.programId()" (valueChange)="store.setProgram($event)">
              @for (p of store.programs(); track p.id) {
                <mat-option [value]="p.id">{{ p.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        } @else {
          <a tools mat-stroked-button routerLink="/programs">{{
            'stats.adherence.goPrograms' | transloco
          }}</a>
        }

        @if (store.adherence(); as a) {
          <div class="tiles">
            <p class="hero">
              <span class="hero-label">{{ 'stats.adherence.percent' | transloco }}</span>
              <span class="hero-value">{{
                a.adherencePercent === null ? '—' : a.adherencePercent + ' %'
              }}</span>
            </p>
            <p class="tile">
              <span class="hero-label">{{ 'stats.adherence.completed' | transloco }}</span>
              <span class="tile-value">{{
                'stats.adherence.ofPlanned'
                  | transloco: { done: a.completedSessions, planned: a.plannedSessions }
              }}</span>
            </p>
            <p class="tile">
              <span class="hero-label">{{ 'stats.adherence.extra' | transloco }}</span>
              <span class="tile-value">{{ a.extraSessions }}</span>
            </p>
          </div>
        }
        <app-chart
          chart
          [options]="adherenceOptions()"
          [label]="'stats.adherence.aria' | transloco"
        />
        <table table class="sg-table">
          <thead>
            <tr>
              <th scope="col">{{ 'stats.table.week' | transloco }}</th>
              <th scope="col" class="num">{{ 'stats.adherence.planned' | transloco }}</th>
              <th scope="col" class="num">{{ 'stats.adherence.completed' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            @for (w of adherenceWeeks(); track w.week) {
              <tr>
                <td>{{ 'stats.adherence.weekN' | transloco: { n: w.week } }}</td>
                <td class="num">{{ w.planned }}</td>
                <td class="num">{{ w.completed }}</td>
              </tr>
            }
          </tbody>
        </table>
      </app-chart-card>
    </div>
  `,
  styleUrl: './stats-page.scss',
  styles: `
    .year {
      display: flex;
      align-items: center;
    }
    .year-label {
      min-width: 3em;
      text-align: center;
      font: var(--mat-sys-title-small);
      font-variant-numeric: tabular-nums;
    }
    /* 53 week columns don't fit a phone: the heatmap scrolls inside its card, never the page. */
    .heatmap-scroll {
      overflow-x: auto;
    }
    .heatmap {
      min-width: 720px;
    }
    .legend {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    .tiles {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 8px 32px;
      margin-bottom: 8px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      margin: 0 0 8px;
    }
    .tile-value {
      font: var(--mat-sys-title-large);
    }
  `,
})
export class StatsConsistencyPage {
  protected readonly store = inject(StatsStore);
  private readonly theme = inject(ChartTheme);
  private readonly auth = inject(AuthStore);
  protected readonly currentYear = new Date().getFullYear();

  protected readonly ramp = computed(() => [
    this.theme.tokens().empty,
    ...this.theme.tokens().ordinal,
  ]);
  protected readonly trainedDays = computed(() => this.store.frequency()?.heatmap.length ?? 0);
  protected readonly weeksDesc = computed(() =>
    (this.store.frequency()?.weeks ?? []).slice().reverse(),
  );
  protected readonly adherenceWeeks = computed(() => this.store.adherence()?.weeks ?? []);

  protected readonly heatmapOptions = computed(() => {
    const frequency = this.store.frequency();
    return frequency
      ? frequencyHeatmapOption(
          this.theme.context(),
          frequency,
          this.auth.user()?.preferences.firstDayOfWeek ?? 1,
        )
      : null;
  });
  protected readonly adherenceOptions = computed(() =>
    adherenceOption(this.theme.context(), this.adherenceWeeks()),
  );

  constructor() {
    this.store.activate('consistency');
  }
}
