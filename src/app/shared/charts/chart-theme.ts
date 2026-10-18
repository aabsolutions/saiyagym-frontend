import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

type Params = Record<string, unknown>;
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { cmToIn, formatNumber, kgToLb } from '../units/units';
import { ChartTokens, chartTokens } from './chart-palette';

/** What pure option builders need: plain values, so they are testable without DI. */
export interface ChartContext {
  t: ChartTokens;
  locale: string;
  imperial: boolean;
  weightUnit: string;
  lengthUnit: string;
  translate: (key: string, params?: Params) => string;
}

/** kg → the unit of `ctx` (plot values; formatting is separate). */
export const weightIn = (ctx: ChartContext, kg: number): number => (ctx.imperial ? kgToLb(kg) : kg);
export const lengthIn = (ctx: ChartContext, cm: number): number => (ctx.imperial ? cmToIn(cm) : cm);

/**
 * Everything a chart's options depend on besides its data: colors of the resolved theme,
 * language, units. Read inside a `computed` and the chart re-renders when any of them changes.
 */
@Injectable({ providedIn: 'root' })
export class ChartTheme {
  private readonly prefs = inject(PreferencesStore);
  private readonly transloco = inject(TranslocoService);
  /** Follows the active language; `translate()` reads it so computeds re-run once it loads. */
  private readonly translation = toSignal(this.transloco.selectTranslation(), {
    initialValue: {},
  });

  readonly tokens = computed(() => chartTokens(this.prefs.resolvedTheme()));
  readonly locale = computed(() => this.prefs.language());
  readonly imperial = computed(() => this.prefs.units() === 'imperial');

  /** Read it inside a `computed`: the chart re-renders on theme, language or unit changes. */
  readonly context = computed<ChartContext>(() => ({
    t: this.tokens(),
    locale: this.locale(),
    imperial: this.imperial(),
    weightUnit: this.weightUnit(),
    lengthUnit: this.lengthUnit(),
    translate: (key, params) => this.translate(key, params),
  }));

  translate(key: string, params?: Params): string {
    this.translation();
    return this.transloco.translate(key, params);
  }

  weightUnit(): string {
    return this.translate(this.imperial() ? 'units.lb' : 'units.kg');
  }

  lengthUnit(): string {
    return this.translate(this.imperial() ? 'units.in' : 'units.cm');
  }

  /** kg → the user's unit (numbers for the plot; formatting is separate). */
  weight(kg: number): number {
    return this.imperial() ? kgToLb(kg) : kg;
  }

  length(cm: number): number {
    return this.imperial() ? cmToIn(cm) : cm;
  }

  /** "102,5 kg" in the active language. */
  formatWeight(kg: number, digits = 1): string {
    return `${formatNumber(this.weight(kg), this.locale(), digits)} ${this.weightUnit()}`;
  }

  formatLength(cm: number, digits = 1): string {
    return `${formatNumber(this.length(cm), this.locale(), digits)} ${this.lengthUnit()}`;
  }
}
