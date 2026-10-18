import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { TierGoal } from '../../shared/exercises/exercise-taxonomy';
import { TierChip } from '../../shared/exercises/tier-chip';

/** Presentational: one exercise row/card. The container decides what the buttons do. */
@Component({
  selector: 'app-exercise-card',
  imports: [MatButtonModule, MatIconModule, RouterLink, TierChip, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let ex = exercise();
    <article class="card" [class.compact]="compact()">
      <a class="main" [routerLink]="['/exercises', ex.id]">
        @if (ex.imageUrl && !compact()) {
          <img [src]="ex.imageUrl" alt="" loading="lazy" width="56" height="56" />
        } @else if (!compact()) {
          <span class="thumb" aria-hidden="true"><mat-icon>fitness_center</mat-icon></span>
        }
        <span class="text">
          <span class="name">{{ ex.name }}</span>
          <span class="meta">
            <span>{{ 'exercises.muscles.' + ex.primaryMuscle | transloco }}</span>
            <span>{{ 'exercises.equipment.' + ex.equipment | transloco }}</span>
          </span>
        </span>
      </a>
      <span class="badges">
        @if (ex.isCustom) {
          <span class="custom">{{ 'exercises.customBadge' | transloco }}</span>
        }
        @if (goalTier(); as tier) {
          <app-tier-chip [tier]="tier" />
        }
        @if (personalTier(); as personal) {
          <app-tier-chip [tier]="personal" [personal]="true" />
        }
      </span>
      @if (showFavorite()) {
        <button
          mat-icon-button
          type="button"
          class="fav"
          [class.on]="ex.isFavorite"
          [attr.aria-pressed]="ex.isFavorite"
          [attr.aria-label]="
            (ex.isFavorite ? 'exercises.unfavorite' : 'exercises.favorite') | transloco
          "
          (click)="favoriteToggled.emit(ex)"
        >
          <mat-icon>{{ ex.isFavorite ? 'star' : 'star_outline' }}</mat-icon>
        </button>
      }
      <ng-content />
    </article>
  `,
  styleUrl: './exercise-card.scss',
})
export class ExerciseCard {
  readonly exercise = input.required<ExerciseSummaryDto>();
  /** Which goal's global tier to show; null hides it. */
  readonly goal = input<TierGoal | null>(null);
  readonly showPersonal = input(true);
  readonly showFavorite = input(true);
  readonly compact = input(false);
  readonly favoriteToggled = output<ExerciseSummaryDto>();

  protected readonly goalTier = computed(() => {
    const goal = this.goal();
    return goal ? this.exercise().tiers[goal] : null;
  });

  /** Personal tiers are per goal too: only the one for the goal being shown. */
  protected readonly personalTier = computed(() => {
    const goal = this.goal();
    return goal && this.showPersonal() ? this.exercise().personalTiers[goal] : null;
  });
}
