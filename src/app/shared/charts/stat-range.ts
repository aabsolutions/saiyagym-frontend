import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';

export type RangePreset = '30d' | '90d' | '6m' | '1y' | 'all';
export const RANGE_PRESETS: readonly RangePreset[] = ['30d', '90d', '6m', '1y', 'all'];
export const DEFAULT_RANGE: RangePreset = '90d';

/** Free plans see the last 90 days (seed value; the API clamps whatever we ask for). */
export const exceedsFreeWindow = (preset: RangePreset): boolean =>
  preset === '6m' || preset === '1y' || preset === 'all';

export const isRangePreset = (value: unknown): value is RangePreset =>
  (RANGE_PRESETS as readonly unknown[]).includes(value);

/** `from` as a UTC instant at LOCAL midnight; no `to` = up to now. */
export function rangeFrom(preset: RangePreset, now = new Date()): string | undefined {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case '30d':
      start.setDate(start.getDate() - 29);
      break;
    case '90d':
      start.setDate(start.getDate() - 89);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'all':
      return undefined;
  }
  return start.toISOString();
}

/** Date-range presets (the filter every reader reaches for first). */
@Component({
  selector: 'app-stat-range',
  imports: [MatButtonToggleModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      hideSingleSelectionIndicator
      [value]="value()"
      [attr.aria-label]="'charts.range.label' | transloco"
      (change)="changed.emit($event.value)"
    >
      @for (preset of presets; track preset) {
        <mat-button-toggle [value]="preset">
          @if (locked() && isPremium(preset)) {
            <mat-icon class="lock" [attr.aria-label]="'charts.range.premium' | transloco"
              >lock</mat-icon
            >
          }
          {{ 'charts.range.' + preset | transloco }}
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: `
    mat-button-toggle-group {
      flex-wrap: wrap;
    }
    .lock {
      width: 16px;
      height: 16px;
      font-size: 16px;
      vertical-align: -3px;
    }
  `,
})
export class StatRange {
  private readonly auth = inject(AuthStore);

  readonly value = input.required<RangePreset>();
  readonly changed = output<RangePreset>();

  protected readonly presets = RANGE_PRESETS;
  protected readonly isPremium = exceedsFreeWindow;
  protected readonly locked = computed(() => !this.auth.hasFeature('fullStats'));
}
