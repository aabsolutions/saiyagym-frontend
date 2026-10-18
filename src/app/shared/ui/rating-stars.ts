import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * 1–5 session rating. Read-only by default; `editable` makes each star a toggle button
 * (clicking the current value clears it).
 */
@Component({
  selector: 'app-rating-stars',
  imports: [MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editable()) {
      <div class="stars" role="radiogroup" [attr.aria-label]="'history.rating' | transloco">
        @for (n of stars; track n) {
          <button
            type="button"
            role="radio"
            class="star"
            [class.on]="(value() ?? 0) >= n"
            [attr.aria-checked]="value() === n"
            [attr.aria-label]="'history.ratingN' | transloco: { n }"
            (click)="value.set(value() === n ? null : n)"
          >
            <mat-icon>{{ (value() ?? 0) >= n ? 'star' : 'star_outline' }}</mat-icon>
          </button>
        }
      </div>
    } @else if (value(); as v) {
      <span class="stars" role="img" [attr.aria-label]="'history.ratingN' | transloco: { n: v }">
        @for (n of stars; track n) {
          <mat-icon class="star" [class.on]="v >= n" aria-hidden="true">{{
            v >= n ? 'star' : 'star_outline'
          }}</mat-icon>
        }
      </span>
    }
  `,
  styles: `
    .stars {
      display: inline-flex;
      align-items: center;
    }
    .star {
      color: var(--mat-sys-outline);
      &.on {
        color: var(--sg-gold);
      }
    }
    button.star {
      display: inline-grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: none;
      cursor: pointer;
      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
      }
    }
    span .star {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
  `,
})
export class RatingStars {
  readonly value = model<number | null>(null);
  readonly editable = input(false);
  protected readonly stars = [1, 2, 3, 4, 5];
}
