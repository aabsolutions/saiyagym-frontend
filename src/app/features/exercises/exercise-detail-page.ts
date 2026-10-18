import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { ExercisePerformanceDto } from '../../api/models/exercise-performance-dto';
import { TIERS, TIER_GOALS } from '../../shared/exercises/exercise-taxonomy';
import { TierChip } from '../../shared/exercises/tier-chip';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { ExerciseDetailStore, HISTORY_PAGE_SIZE } from './exercise-detail.store';
import { hasRecords } from './exercise-records';
import { ExercisesStore } from './exercises.store';

@Component({
  selector: 'app-exercise-detail-page',
  imports: [
    LocalDatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RouterLink,
    TierChip,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-detail-page.html',
  styleUrl: './exercise-detail-page.scss',
})
export class ExerciseDetailPage {
  protected readonly store = inject(ExerciseDetailStore);
  private readonly list = inject(ExercisesStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** Route param (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  protected readonly tiers = TIERS;
  protected readonly goals = TIER_GOALS;
  protected readonly historyPageSize = HISTORY_PAGE_SIZE;
  protected readonly hasRecords = computed(() => hasRecords(this.store.records()));

  constructor() {
    effect(() => void this.store.load(this.id()));
  }

  /** Working sets only, as "100 kg × 5": warmups never count (domain rule). */
  protected workingSets(entry: ExercisePerformanceDto) {
    return entry.sets.filter((s) => s.type !== 'warmup' && s.completed);
  }

  protected onHistoryPage(event: PageEvent): void {
    void this.store.historyPageChange(event.pageIndex + 1);
  }

  protected async toggleFavorite(): Promise<void> {
    await this.store.toggleFavorite();
    void this.list.refresh();
  }

  protected async remove(): Promise<void> {
    const data: ConfirmDialogData = {
      title: 'exercises.detail.deleteTitle',
      message: 'exercises.detail.deleteMessage',
      confirm: 'exercises.detail.delete',
      danger: true,
    };
    const confirmed = await firstValueFrom(this.dialog.open(ConfirmDialog, { data }).afterClosed());
    if (confirmed !== true || !(await this.store.remove())) return;
    void this.list.refresh();
    await this.router.navigateByUrl('/exercises');
  }
}
