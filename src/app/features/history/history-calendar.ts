import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { WorkoutSummaryDto } from '../../api/models/workout-summary-dto';
import { fromIso } from '../../shared/format/local-dates';
import { routineColorIndex } from './history-model';

/** Month grid; trained days get one dot per session, colored by routine. Presentational. */
@Component({
  selector: 'app-history-calendar',
  imports: [MatButtonModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-calendar.html',
  styleUrl: './history-calendar.scss',
})
export class HistoryCalendar {
  /** `YYYY-MM`. */
  readonly month = input.required<string>();
  readonly weeks = input.required<string[][]>();
  readonly weekdays = input.required<number[]>();
  readonly byDay = input.required<Map<string, WorkoutSummaryDto[]>>();
  readonly routineOrder = input.required<readonly string[]>();
  readonly routineName = input.required<(id: string | null) => string | null>();
  readonly today = input.required<string>();
  readonly selectedDay = input<string | null>(null);
  /** Language, so the month title follows it. */
  readonly lang = input.required<string>();

  readonly monthShifted = output<number>();
  readonly daySelected = output<string>();

  protected readonly title = computed(() =>
    new Intl.DateTimeFormat(this.lang(), { month: 'long', year: 'numeric' }).format(
      fromIso(`${this.month()}-01`),
    ),
  );

  /** Routines trained this month, for the legend. */
  protected readonly legend = computed(() => {
    const seen = new Map<string, number>();
    for (const sessions of this.byDay().values())
      for (const w of sessions) {
        const color = routineColorIndex(w.routineId, this.routineOrder());
        if (w.routineId && color !== null) seen.set(w.routineId, color);
      }
    return [...seen].map(([id, color]) => ({ id, color, name: this.routineName()(id) ?? '' }));
  });

  protected color(w: WorkoutSummaryDto): number | null {
    return routineColorIndex(w.routineId, this.routineOrder());
  }

  protected dayNumber(date: string): number {
    return Number(date.slice(8));
  }
}
