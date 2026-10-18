import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminGuidelineDto } from '../../../api/models/admin-guideline-dto';
import { ValidationMessagePipe } from '../../../shared/forms/validation-message.pipe';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { NUTRITION_GOALS } from '../../nutrition/nutrition-model';
import { GuidelineFormModel, guidelineSchema, toGuidelineForm } from './nutrition-forms';

export interface GuidelineDialogData {
  guideline: AdminGuidelineDto | null;
  save: (model: GuidelineFormModel) => Promise<boolean>;
}

@Component({
  selector: 'app-guideline-dialog',
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
      {{
        (data.guideline ? 'admin.guidelines.editTitle' : 'admin.guidelines.newTitle') | transloco
      }}
    </h2>
    <form [formRoot]="guidelineForm">
      <mat-dialog-content>
        <app-translatable-field
          labelKey="admin.fields.title"
          mandatory
          [formField]="guidelineForm.title"
        />
        <div class="form-grid">
          <mat-form-field>
            <mat-label>{{ 'admin.fields.slug' | transloco }}</mat-label>
            <input matInput [formField]="guidelineForm.slug" />
            <mat-error>{{ guidelineForm.slug().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'admin.guidelines.goals' | transloco }}</mat-label>
            <mat-select multiple [formField]="guidelineForm.goals">
              @for (g of goals; track g) {
                <mat-option [value]="g">{{ 'nutrition.goals.' + g | transloco }}</mat-option>
              }
            </mat-select>
            <mat-error>{{ guidelineForm.goals().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'admin.fields.sortOrder' | transloco }}</mat-label>
            <input matInput type="number" [formField]="guidelineForm.sortOrder" />
          </mat-form-field>
        </div>
        <app-translatable-field
          labelKey="admin.fields.summary"
          mandatory
          multiline
          [rows]="2"
          [formField]="guidelineForm.summary"
        />
        <app-translatable-field
          labelKey="admin.fields.body"
          mandatory
          multiline
          [rows]="8"
          [formField]="guidelineForm.body"
        />
        <p class="hint">{{ 'admin.guidelines.bodyHint' | transloco }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button type="submit" [disabled]="guidelineForm().submitting()">
          {{ 'common.save' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: '../admin.scss',
})
export class GuidelineDialog {
  protected readonly data = inject<GuidelineDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<GuidelineDialog>);
  protected readonly goals = NUTRITION_GOALS;

  private readonly model = signal(toGuidelineForm(this.data.guideline));
  protected readonly guidelineForm = form(
    this.model,
    guidelineSchema(() => !this.data.guideline),
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
