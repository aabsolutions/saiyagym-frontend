import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { AdminFoodDto } from '../../../api/models/admin-food-dto';
import { AdminMealSuggestionDto } from '../../../api/models/admin-meal-suggestion-dto';
import { AdminNutritionService } from '../../../api/services/admin-nutrition.service';
import { ValidationMessagePipe } from '../../../shared/forms/validation-message.pipe';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { localizeText } from '../../../shared/i18n/translatable';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { MEAL_TYPES, NUTRITION_GOALS } from '../../nutrition/nutrition-model';
import {
  MealFormModel,
  NUTRITION_LIMITS,
  mealSchema,
  toMealForm,
  validGrams,
} from './nutrition-forms';

export interface MealDialogData {
  meal: AdminMealSuggestionDto | null;
  /** Names of the foods the meal already uses (by slug), resolved by the page. */
  foodNames: Map<string, string>;
  save: (model: MealFormModel) => Promise<boolean>;
}

@Component({
  selector: 'app-meal-dialog',
  imports: [
    FormField,
    FormRoot,
    LocalizedPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslatableField,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ (data.meal ? 'admin.meals.editTitle' : 'admin.meals.newTitle') | transloco }}
    </h2>
    <form [formRoot]="mealForm">
      <mat-dialog-content>
        <app-translatable-field
          labelKey="admin.fields.name"
          mandatory
          [formField]="mealForm.name"
        />
        <div class="form-grid">
          <mat-form-field>
            <mat-label>{{ 'admin.fields.slug' | transloco }}</mat-label>
            <input matInput [formField]="mealForm.slug" />
            <mat-error>{{ mealForm.slug().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.meals.goal' | transloco }}</mat-label>
            <mat-select [formField]="mealForm.goal">
              @for (g of goals; track g) {
                <mat-option [value]="g">{{ 'nutrition.goals.' + g | transloco }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.meals.type' | transloco }}</mat-label>
            <mat-select [formField]="mealForm.mealType">
              @for (t of mealTypes; track t) {
                <mat-option [value]="t">{{ 'nutrition.mealTypes.' + t | transloco }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'admin.fields.sortOrder' | transloco }}</mat-label>
            <input matInput type="number" [formField]="mealForm.sortOrder" />
          </mat-form-field>
        </div>
        <!-- mat-checkbox has no Signal Forms integration: bound by hand. -->
        <mat-checkbox [checked]="model().isSample" (change)="setSample($event.checked)">
          {{ 'admin.meals.isSample' | transloco }}
        </mat-checkbox>
        <p class="hint">{{ 'admin.meals.isSampleHint' | transloco }}</p>

        <app-translatable-field
          labelKey="admin.fields.description"
          multiline
          [formField]="mealForm.description"
        />

        <h3 class="section-title">{{ 'admin.meals.items' | transloco }}</h3>
        <mat-form-field class="full-width">
          <mat-label>{{ 'admin.meals.addFood' | transloco }}</mat-label>
          <mat-icon matPrefix aria-hidden="true">search</mat-icon>
          <input
            matInput
            [value]="query()"
            [matAutocomplete]="auto"
            [disabled]="model().items.length >= maxItems"
            (input)="query.set($any($event.target).value)"
          />
          <mat-autocomplete
            #auto
            [displayWith]="blank"
            (optionSelected)="addFood($event.option.value)"
          >
            @for (food of results(); track food.id) {
              <mat-option [value]="food">
                {{ food.name | localized }}
                <span class="muted"
                  >· {{ 'units.kcalPer100' | transloco: { kcal: food.per100g.kcal } }}</span
                >
              </mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <ul class="items">
          @for (item of model().items; track item.foodSlug; let i = $index) {
            <li>
              <span class="item-name">
                {{ item.foodName || item.foodSlug }}
                <span class="muted">{{ item.foodSlug }}</span>
              </span>
              <mat-form-field subscriptSizing="dynamic" class="grams">
                <mat-label>{{ 'nutrition.meals.grams' | transloco }}</mat-label>
                <input
                  matInput
                  type="number"
                  min="1"
                  max="2000"
                  step="1"
                  [value]="item.grams"
                  (input)="setGrams(i, +$any($event.target).value)"
                />
                <span matTextSuffix>{{ 'units.g' | transloco }}</span>
                @if (!validGrams(item.grams)) {
                  <mat-error>{{ 'admin.meals.gramsError' | transloco }}</mat-error>
                }
              </mat-form-field>
              <button
                mat-icon-button
                type="button"
                [attr.aria-label]="
                  'admin.deleteItem' | transloco: { name: item.foodName || item.foodSlug }
                "
                (click)="removeItem(i)"
              >
                <mat-icon>close</mat-icon>
              </button>
            </li>
          }
        </ul>
        @if (mealForm.items().touched() || mealForm().submitting()) {
          @if (mealForm.items().errors().length) {
            <p class="error" role="alert">
              {{ mealForm.items().errors() | validationMessage }}
            </p>
          }
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button type="submit" [disabled]="mealForm().submitting() || badGrams()">
          {{ 'common.save' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: '../admin.scss',
  styles: `
    .items {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
      li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
    }
    .item-name {
      flex: 1 1 200px;
    }
    .muted {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .grams {
      width: 140px;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class MealDialog {
  protected readonly data = inject<MealDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MealDialog>);
  private readonly api = inject(AdminNutritionService);
  private readonly transloco = inject(TranslocoService);

  protected readonly goals = NUTRITION_GOALS;
  protected readonly mealTypes = MEAL_TYPES;
  protected readonly maxItems = NUTRITION_LIMITS.mealItems;
  protected readonly validGrams = validGrams;

  protected readonly model = signal(
    toMealForm(this.data.meal, (slug) => this.data.foodNames.get(slug) ?? ''),
  );
  protected readonly mealForm = form(
    this.model,
    mealSchema(() => !this.data.meal),
    {
      submission: {
        action: async (field) => {
          if (await this.data.save(field().value())) this.ref.close(true);
          return undefined;
        },
      },
    },
  );
  protected readonly badGrams = computed(() =>
    this.model().items.some((item) => !validGrams(item.grams)),
  );

  /** The picked option clears the box (it is added to the list below, not kept as text). */
  protected readonly blank = () => '';
  protected readonly query = signal('');
  protected readonly results = toSignal(
    toObservable(this.query).pipe(
      map((q) => (typeof q === 'string' ? q.trim() : '')),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) =>
        q.length < 2
          ? of<AdminFoodDto[]>([])
          : from(this.api.adminFoodsControllerList({ q, page: 1, limit: 10 })).pipe(
              map((page) => page.items),
              catchError(() => of<AdminFoodDto[]>([])),
            ),
      ),
    ),
    { initialValue: [] },
  );

  /** A food already in the meal just keeps its row (one row per food). */
  protected addFood(food: AdminFoodDto): void {
    this.query.set('');
    if (this.model().items.some((i) => i.foodSlug === food.slug)) return;
    const foodName = localizeText(food.name, this.transloco.getActiveLang());
    this.model.update((m) => ({
      ...m,
      items: [...m.items, { foodSlug: food.slug, foodName, grams: 100 }],
    }));
    this.mealForm.items().markAsTouched();
  }

  protected setGrams(index: number, grams: number): void {
    this.model.update((m) => ({
      ...m,
      items: m.items.map((item, i) => (i === index ? { ...item, grams } : item)),
    }));
  }

  protected removeItem(index: number): void {
    this.model.update((m) => ({ ...m, items: m.items.filter((_, i) => i !== index) }));
    this.mealForm.items().markAsTouched();
  }

  protected setSample(isSample: boolean): void {
    this.model.update((m) => ({ ...m, isSample }));
  }
}
