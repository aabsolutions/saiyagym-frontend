import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { ExerciseAutocomplete, PickedExercise } from '../../shared/exercises/exercise-autocomplete';
import { DurationPipe } from '../../shared/format/duration.pipe';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { orderedWeekdays, todayIso } from '../../shared/format/local-dates';
import { RatingStars } from '../../shared/ui/rating-stars';
import { WeightPipe } from '../../shared/units/weight.pipe';
import {
  HISTORY_PAGE_SIZE,
  filtersFromParams,
  filtersToParams,
  hasFilters,
  monthFromParams,
  monthGrid,
  pageFromParams,
  routineColorIndex,
  shiftMonth,
} from './history-model';
import { HistoryCalendar } from './history-calendar';
import { HistoryStore } from './history.store';

@Component({
  selector: 'app-history-page',
  imports: [
    DurationPipe,
    ExerciseAutocomplete,
    HistoryCalendar,
    LocalDatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    RatingStars,
    RouterLink,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
})
export class HistoryPage {
  protected readonly store = inject(HistoryStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly lang = inject(TranslocoService).activeLang;

  protected readonly pageSize = HISTORY_PAGE_SIZE;
  protected readonly today = todayIso();
  protected readonly weekdays = orderedWeekdays(
    inject(AuthStore).user()?.preferences.firstDayOfWeek ?? 1,
  );
  protected readonly weeks = computed(() => monthGrid(this.store.month(), this.weekdays[0]));
  protected readonly filtered = computed(() => hasFilters(this.store.filters()));
  /** A single-day filter is what the calendar highlights. */
  protected readonly selectedDay = computed(() => {
    const { from, to } = this.store.filters();
    return from && from === to ? from : null;
  });
  protected readonly selectedExercise = computed<PickedExercise | null>(() => {
    const id = this.store.filters().exerciseId;
    return id ? { id, name: this.store.exerciseName() ?? '' } : null;
  });

  constructor() {
    // URL → store, once (shared links, back button).
    const params = this.route.snapshot.queryParams;
    this.store.init(filtersFromParams(params), monthFromParams(params), pageFromParams(params));
    void this.store.resolveExerciseName();

    // Store → URL.
    effect(() => {
      const queryParams = filtersToParams(
        this.store.filters(),
        this.store.month(),
        this.store.page(),
      );
      untracked(() =>
        this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true }),
      );
    });
  }

  protected setDate(key: 'from' | 'to', value: string): void {
    this.store.setFilters({ [key]: value || null });
  }

  protected setExercise(exercise: PickedExercise | null): void {
    this.store.setExerciseName(exercise?.name ?? null);
    this.store.setFilters({ exerciseId: exercise?.id ?? null });
  }

  protected shiftMonth(delta: number): void {
    this.store.setMonth(shiftMonth(this.store.month(), delta));
  }

  protected onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1);
  }

  protected color(routineId: string | null): number | null {
    return routineColorIndex(routineId, this.store.routineOrder());
  }
}
