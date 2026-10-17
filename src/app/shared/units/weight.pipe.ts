import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { UnitSystem, formatNumber, kgToLb } from './units';

export interface UnitPipeOptions {
  /** Overrides the user's preference. */
  system?: UnitSystem;
  digits?: number;
}

/**
 * `{{ set.weightKg | weight }}` → "100 kg" or "220.5 lb" per the user's units.
 * Impure because the result depends on preference/language signals, not only on the input.
 */
@Pipe({ name: 'weight', pure: false })
export class WeightPipe implements PipeTransform {
  private readonly prefs = inject(PreferencesStore);
  private readonly transloco = inject(TranslocoService);

  transform(kg: number | null | undefined, options: UnitPipeOptions = {}): string {
    if (kg === null || kg === undefined || Number.isNaN(kg)) return '';
    const imperial = (options.system ?? this.prefs.units()) === 'imperial';
    const value = imperial ? kgToLb(kg) : kg;
    const unit = this.transloco.translate(imperial ? 'units.lb' : 'units.kg');
    return `${formatNumber(value, this.transloco.getActiveLang(), options.digits ?? 1)} ${unit}`;
  }
}
