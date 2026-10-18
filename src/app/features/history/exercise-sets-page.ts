import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExercisePerformanceDto } from '../../api/models/exercise-performance-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { toSetRows } from './exercise-sets';

/** Sessions per page; each session can have many sets. */
export const SESSIONS_PER_PAGE = 20;

@Component({
  selector: 'app-exercise-sets-page',
  imports: [
    LocalDatePipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    RouterLink,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-sets-page.html',
  styleUrl: './exercise-sets-page.scss',
})
export class ExerciseSetsPage {
  private readonly api = inject(ExercisesService);

  /** Route param: the exercise id. */
  readonly id = input.required<string>();

  protected readonly pageSize = SESSIONS_PER_PAGE;
  protected readonly name = signal<string | null>(null);
  protected readonly sessions = signal<ExercisePerformanceDto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly rows = computed(() => toSetRows(this.sessions()));

  constructor() {
    effect(() => {
      const id = this.id();
      void this.api
        .exercisesControllerDetail({ id })
        .then((e) => this.name.set(e.name))
        .catch(() => this.name.set(null));
      void this.load(id, this.page());
    });
  }

  private async load(id: string, page: number): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.api.exercisePerformanceControllerHistory({
        id,
        page,
        limit: SESSIONS_PER_PAGE,
      });
      this.sessions.set(result.items);
      this.total.set(result.meta.total);
    } catch {
      this.sessions.set([]);
      this.total.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }
}
