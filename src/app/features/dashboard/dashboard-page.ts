import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Chart } from '../../shared/charts/chart';
import { ChartTheme } from '../../shared/charts/chart-theme';
import { DurationPipe } from '../../shared/format/duration.pipe';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { todayIso } from '../../shared/format/local-dates';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { measurementOption } from '../body/body-charts';
import { DashboardStore } from './dashboard.store';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    Chart,
    DurationPipe,
    LocalDatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly store = inject(DashboardStore);
  private readonly theme = inject(ChartTheme);
  protected readonly today = todayIso();

  protected readonly periods = computed(() => {
    const summary = this.store.summary();
    return summary
      ? [
          { key: 'week', totals: summary.week },
          { key: 'month', totals: summary.month },
        ]
      : [];
  });

  protected readonly weightOptions = computed(() =>
    measurementOption(this.theme.context(), 'weightKg', this.store.weight(), { compact: true }),
  );
}
