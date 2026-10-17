import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

/** Placeholder body for features that only have their route + store so far. */
@Component({
  selector: 'app-coming-soon',
  imports: [MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ titleKey() | transloco }}</h1>
      <div class="empty">
        <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
        <p>{{ 'common.comingSoon' | transloco }}</p>
      </div>
    </section>
  `,
  styles: `
    .empty {
      display: grid;
      place-items: center;
      gap: 8px;
      padding: 48px 16px;
      border: 1px dashed var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-large);
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }
    mat-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
      color: var(--sg-gold);
    }
  `,
})
export class ComingSoon {
  readonly titleKey = input.required<string>();
  readonly icon = input('construction');
}
