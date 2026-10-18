import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { MUSCLES, TIERS, TIER_GOALS, Tier, isTier } from '../../shared/exercises/exercise-taxonomy';
import { TierChip } from '../../shared/exercises/tier-chip';
import { ExerciseCard } from './exercise-card';
import { TierBoardStore } from './tier-board.store';

const UNRANKED = 'unranked';

@Component({
  selector: 'app-tier-board-page',
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    ExerciseCard,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    TierChip,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tier-board-page.html',
  styleUrl: './tier-board-page.scss',
})
export class TierBoardPage {
  protected readonly store = inject(TierBoardStore);

  protected readonly tiers = TIERS;
  protected readonly goals = TIER_GOALS;
  protected readonly muscles = MUSCLES;
  protected readonly unranked = UNRANKED;

  constructor() {
    this.store.connect(this.store.query);
  }

  /** Unranked is a source only: dropping there would mean "no tier", which isn't a tier. */
  protected readonly canEnter = (_drag: CdkDrag, drop: CdkDropList) => drop.data !== UNRANKED;

  protected onDrop(event: CdkDragDrop<Tier>): void {
    const to = event.container.data;
    if (event.previousContainer === event.container || !isTier(to)) return;
    void this.store.moveTo((event.item.data as ExerciseSummaryDto).id, to);
  }
}
