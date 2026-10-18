import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProgressPhotoDto } from '../../api/models/progress-photo-dto';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';

/**
 * Before/after on top of each other; the slider reveals "before" from the left. A native
 * range input drives it, so keyboard and screen readers work out of the box.
 */
@Component({
  selector: 'app-photo-compare',
  imports: [LocalDatePipe, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stage">
      <img
        class="photo"
        [src]="after().url"
        [alt]="'body.photos.afterAlt' | transloco: { date: (after().takenAt | localDate) }"
      />
      <img
        class="photo before"
        [src]="before().url"
        [alt]="'body.photos.beforeAlt' | transloco: { date: (before().takenAt | localDate) }"
        [style.clip-path]="'inset(0 ' + (100 - position()) + '% 0 0)'"
      />
      <div class="divider" [style.left.%]="position()" aria-hidden="true"></div>
      <span class="tag left">{{ before().takenAt | localDate: 'short' }}</span>
      <span class="tag right">{{ after().takenAt | localDate: 'short' }}</span>
      <input
        class="slider"
        type="range"
        min="0"
        max="100"
        [value]="position()"
        [attr.aria-label]="'body.photos.slider' | transloco"
        (input)="position.set(+$any($event.target).value)"
      />
    </div>
  `,
  styles: `
    .stage {
      position: relative;
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-surface-container-high);
    }
    .photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }
    .divider {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: -1px;
      background: var(--mat-sys-surface);
      box-shadow: 0 0 0 1px var(--mat-sys-outline);
      pointer-events: none;
    }
    .tag {
      position: absolute;
      top: 8px;
      padding: 2px 8px;
      border-radius: var(--mat-sys-corner-small);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-label-medium);
    }
    .left {
      left: 8px;
    }
    .right {
      right: 8px;
    }
    /* The whole stage is the hit target: drag anywhere. */
    .slider {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: ew-resize;
    }
    .stage:has(.slider:focus-visible) {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }
  `,
})
export class PhotoCompare {
  readonly before = input.required<ProgressPhotoDto>();
  readonly after = input.required<ProgressPhotoDto>();
  protected readonly position = signal(50);
}
