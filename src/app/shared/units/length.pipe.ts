import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { cmToIn, formatNumber } from './units';
import { UnitPipeOptions } from './weight.pipe';

/** `{{ metric.waistCm | length }}` → "80 cm" or "31.5 in" per the user's units. */
@Pipe({ name: 'length', pure: false })
export class LengthPipe implements PipeTransform {
  private readonly prefs = inject(PreferencesStore);
  private readonly transloco = inject(TranslocoService);

  transform(cm: number | null | undefined, options: UnitPipeOptions = {}): string {
    if (cm === null || cm === undefined || Number.isNaN(cm)) return '';
    const imperial = (options.system ?? this.prefs.units()) === 'imperial';
    const value = imperial ? cmToIn(cm) : cm;
    const unit = this.transloco.translate(imperial ? 'units.in' : 'units.cm');
    return `${formatNumber(value, this.transloco.getActiveLang(), options.digits ?? 1)} ${unit}`;
  }
}
