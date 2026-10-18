import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminFoodDto } from '../../../api/models/admin-food-dto';
import { ValidationMessagePipe } from '../../../shared/forms/validation-message.pipe';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { FOOD_CATEGORIES, FOOD_TAGS } from '../../nutrition/nutrition-model';
import { FoodFormModel, foodSchema, toFoodForm } from './nutrition-forms';

export interface FoodDialogData {
  food: AdminFoodDto | null;
  save: (model: FoodFormModel) => Promise<boolean>;
}

@Component({
  selector: 'app-food-dialog',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatableField,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ (data.food ? 'admin.foods.editTitle' : 'admin.foods.newTitle') | transloco }}
    </h2>
    <form [formRoot]="foodForm">
      <mat-dialog-content>
        <app-translatable-field
          labelKey="admin.fields.name"
          mandatory
          [formField]="foodForm.name"
        />
        <div class="form-grid">
          <mat-form-field>
            <mat-label>{{ 'admin.fields.slug' | transloco }}</mat-label>
            <input matInput [formField]="foodForm.slug" />
            <mat-error>{{ foodForm.slug().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.foods.category' | transloco }}</mat-label>
            <mat-select [formField]="foodForm.category">
              @for (c of categories; track c) {
                <mat-option [value]="c">{{ 'nutrition.categories.' + c | transloco }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field class="wide">
            <mat-label>{{ 'nutrition.foods.tags' | transloco }}</mat-label>
            <mat-select multiple [formField]="foodForm.tags">
              @for (t of tags; track t) {
                <mat-option [value]="t">{{ 'nutrition.tags.' + t | transloco }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <h3 class="section-title">{{ 'nutrition.foods.per100' | transloco }}</h3>
        <div class="form-grid">
          <mat-form-field>
            <mat-label>{{ 'units.kcal' | transloco }}</mat-label>
            <input matInput type="number" step="0.1" [formField]="foodForm.kcal" />
            <mat-error>{{ foodForm.kcal().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.macros.protein' | transloco }}</mat-label>
            <input matInput type="number" step="0.1" [formField]="foodForm.proteinG" />
            <span matTextSuffix>{{ 'units.g' | transloco }}</span>
            <mat-error>{{ foodForm.proteinG().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.macros.carbs' | transloco }}</mat-label>
            <input matInput type="number" step="0.1" [formField]="foodForm.carbsG" />
            <span matTextSuffix>{{ 'units.g' | transloco }}</span>
            <mat-error>{{ foodForm.carbsG().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.macros.fat' | transloco }}</mat-label>
            <input matInput type="number" step="0.1" [formField]="foodForm.fatG" />
            <span matTextSuffix>{{ 'units.g' | transloco }}</span>
            <mat-error>{{ foodForm.fatG().errors() | validationMessage }}</mat-error>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button type="submit" [disabled]="foodForm().submitting()">
          {{ 'common.save' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: '../admin.scss',
})
export class FoodDialog {
  protected readonly data = inject<FoodDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<FoodDialog>);
  protected readonly categories = FOOD_CATEGORIES;
  protected readonly tags = FOOD_TAGS;

  private readonly model = signal(toFoodForm(this.data.food));
  protected readonly foodForm = form(
    this.model,
    foodSchema(() => !this.data.food),
    {
      submission: {
        action: async (field) => {
          if (await this.data.save(field().value())) this.ref.close(true);
          return undefined;
        },
      },
    },
  );
}
