import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { ChartTheme } from '../../shared/charts/chart-theme';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import {
  ACTIVITY_LEVELS,
  CALCULATOR_BOUNDS,
  FORMULA_SEXES,
  NUTRITION_GOALS,
  boundsIn,
  calculatorModel,
  toCalculatorRequest,
} from './nutrition-model';
import { NutritionStore } from './nutrition.store';

/** Mifflin-St Jeor × activity factor, adjusted per goal. Orientative only (see the shell). */
@Component({
  selector: 'app-calculator-page',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calculator-page.html',
  styleUrl: './calculator-page.scss',
})
export class CalculatorPage {
  protected readonly store = inject(NutritionStore);
  private readonly auth = inject(AuthStore);
  private readonly theme = inject(ChartTheme);

  protected readonly goals = NUTRITION_GOALS;
  protected readonly activityLevels = ACTIVITY_LEVELS;
  protected readonly sexes = FORMULA_SEXES;
  /** Pinned when the page opens: the inputs are typed in this unit. */
  protected readonly units = inject(PreferencesStore).units();
  protected readonly ageBounds = CALCULATOR_BOUNDS.ageYears;
  protected readonly heightBounds = boundsIn('height', this.units);
  protected readonly weightBounds = boundsIn('weight', this.units);
  private readonly profile = () => this.auth.user()?.profile;

  private readonly model = signal(calculatorModel(this.profile(), this.units));
  protected readonly calculatorForm = form(
    this.model,
    (path) => {
      required(path.goal);
      required(path.activityLevel);
      min(path.ageYears, this.ageBounds.min);
      max(path.ageYears, this.ageBounds.max);
      min(path.height, this.heightBounds.min);
      max(path.height, this.heightBounds.max);
      min(path.weight, this.weightBounds.min);
      max(path.weight, this.weightBounds.max);
    },
    {
      submission: {
        action: async (field) => {
          await this.store.calculate(
            toCalculatorRequest(field().value(), this.units, this.profile()),
          );
          return undefined;
        },
      },
    },
  );

  /** Same validated categorical slots as the charts: protein, carbs, fat. */
  protected readonly macroColors = computed(() => this.theme.tokens().categorical.slice(0, 3));
  protected readonly macros = computed(() => {
    const m = this.store.result()?.macros;
    if (!m) return [];
    return [
      { key: 'protein', grams: m.proteinG, percent: m.proteinPercent },
      { key: 'carbs', grams: m.carbsG, percent: m.carbsPercent },
      { key: 'fat', grams: m.fatG, percent: m.fatPercent },
    ];
  });
  /** Which inputs the API took from the profile / last weigh-in (not typed here). */
  protected readonly sources = computed(() =>
    Object.entries(this.store.result()?.input.sources ?? {}).filter(
      ([, source]) => source !== 'request',
    ),
  );

  protected unitKey(field: 'height' | 'weight'): string {
    const imperial = this.units === 'imperial';
    return field === 'height'
      ? imperial
        ? 'units.in'
        : 'units.cm'
      : imperial
        ? 'units.lb'
        : 'units.kg';
  }
}
