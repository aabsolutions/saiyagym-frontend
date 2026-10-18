import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tier } from './exercise-taxonomy';

/** S gold · A green · B blue · C grey. `personal` marks the user's own tier. */
@Component({
  selector: 'app-tier-chip',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="chip"
      [class]="'tier-' + tier()"
      [class.personal]="personal()"
      [attr.title]="(personal() ? 'exercises.tier.personal' : 'exercises.tier.global') | transloco"
    >
      {{ tier() }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .chip {
      display: inline-grid;
      place-items: center;
      min-width: 28px;
      height: 24px;
      padding: 0 6px;
      border-radius: var(--mat-sys-corner-small);
      font: var(--mat-sys-label-large);
      font-weight: 700;
      background: var(--sg-tier-bg);
      color: var(--sg-tier-fg);
    }
    .personal {
      outline: 2px dashed currentColor;
      outline-offset: 1px;
    }
    .tier-S {
      --sg-tier-bg: light-dark(#f5b400, #f5b400);
      --sg-tier-fg: #261a00;
    }
    .tier-A {
      --sg-tier-bg: light-dark(#2e7d32, #81c784);
      --sg-tier-fg: light-dark(#ffffff, #0b2e0d);
    }
    .tier-B {
      --sg-tier-bg: light-dark(#1e3a8a, #b6c4ff);
      --sg-tier-fg: light-dark(#ffffff, #00164e);
    }
    .tier-C {
      --sg-tier-bg: light-dark(#757575, #bdbdbd);
      --sg-tier-fg: light-dark(#ffffff, #212121);
    }
  `,
})
export class TierChip {
  readonly tier = input.required<Tier>();
  readonly personal = input(false);
}
