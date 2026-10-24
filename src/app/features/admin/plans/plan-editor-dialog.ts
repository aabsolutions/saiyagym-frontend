import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  FormRoot,
  disabled,
  form,
  min,
  pattern,
  readonly,
  required,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlanResponseDto } from '../../../api/models/plan-response-dto';
import { FEATURE_KEYS, LIMIT_KEYS } from '../../../core/plans/entitlements';
import { ValidationMessagePipe } from '../../../shared/forms/validation-message.pipe';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { translatable } from '../../../shared/i18n/translatable';
import { PLAN_CODE_PATTERN, PlanFormModel, Quota, toPlanForm } from './plan-form';

export interface PlanEditorData {
  /** null = new plan. */
  plan: PlanResponseDto | null;
  save: (model: PlanFormModel) => Promise<boolean>;
}

/**
 * Entitlements are what the API enforces (limits + features + stats window). A limit left
 * "unlimited" is sent as `null`.
 */
@Component({
  selector: 'app-plan-editor-dialog',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    NgTemplateOutlet,
    TranslatableField,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ (data.plan ? 'admin.plans.editTitle' : 'admin.plans.newTitle') | transloco }}
    </h2>
    <form [formRoot]="planForm">
      <mat-dialog-content>
        <div class="form-grid">
          <mat-form-field>
            <mat-label>{{ 'admin.plans.code' | transloco }}</mat-label>
            <input matInput [formField]="planForm.code" />
            <mat-hint>{{ 'admin.plans.codeHint' | transloco }}</mat-hint>
            <mat-error>{{ planForm.code().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'admin.fields.sortOrder' | transloco }}</mat-label>
            <input matInput type="number" [formField]="planForm.sortOrder" />
          </mat-form-field>
        </div>

        <app-translatable-field
          labelKey="admin.fields.name"
          mandatory
          [formField]="planForm.name"
        />
        <app-translatable-field
          labelKey="admin.fields.description"
          multiline
          [formField]="planForm.description"
        />

        <div class="toggles">
          <mat-checkbox [checked]="model().active" (change)="set('active', $event.checked)">
            {{ 'admin.plans.active' | transloco }}
          </mat-checkbox>
          <mat-checkbox [checked]="model().isDefault" (change)="set('isDefault', $event.checked)">
            {{ 'admin.plans.isDefault' | transloco }}
          </mat-checkbox>
        </div>

        <h3 class="section-title">{{ 'admin.plans.limits' | transloco }}</h3>
        @for (key of limitKeys; track key) {
          <ng-container
            [ngTemplateOutlet]="quotaRow"
            [ngTemplateOutletContext]="{
              field: planForm.limits[key],
              label: 'plans.limits.' + key,
            }"
          />
        }
        <ng-container
          [ngTemplateOutlet]="quotaRow"
          [ngTemplateOutletContext]="{
            field: planForm.statsHistory,
            label: 'admin.plans.statsDays',
          }"
        />
        <ng-container
          [ngTemplateOutlet]="quotaRow"
          [ngTemplateOutletContext]="{
            field: planForm.guides,
            label: 'plans.guidesPerRoutine',
          }"
        />

        <h3 class="section-title">{{ 'admin.plans.features' | transloco }}</h3>
        <div class="features">
          @for (key of featureKeys; track key) {
            <mat-checkbox
              [checked]="model().features[key]"
              (change)="setFeature(key, $event.checked)"
            >
              {{ 'plans.features.' + key | transloco }}
            </mat-checkbox>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button type="submit" [disabled]="planForm().submitting()">
          {{ 'common.save' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>

    <ng-template #quotaRow let-field="field" let-label="label">
      <div class="quota">
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ label | transloco }}</mat-label>
          <input matInput type="number" [formField]="asQuota(field).value" />
          <mat-error>{{ asQuota(field).value().errors() | validationMessage }}</mat-error>
        </mat-form-field>
        <mat-checkbox
          [checked]="asQuota(field).unlimited().value()"
          (change)="asQuota(field).unlimited().value.set($event.checked)"
        >
          {{ 'admin.plans.unlimited' | transloco }}
        </mat-checkbox>
      </div>
    </ng-template>
  `,
  styleUrl: '../admin.scss',
  styles: `
    .toggles,
    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 24px;
    }
    .quota {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 16px;
      margin-bottom: 8px;
    }
  `,
})
export class PlanEditorDialog {
  protected readonly data = inject<PlanEditorData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PlanEditorDialog>);

  protected readonly limitKeys = LIMIT_KEYS;
  protected readonly featureKeys = FEATURE_KEYS;
  protected readonly model = signal(toPlanForm(this.data.plan));

  protected readonly planForm = form(
    this.model,
    (path) => {
      required(path.code);
      pattern(path.code, PLAN_CODE_PATTERN);
      // Seeds and users reference the plan; its code is set once.
      readonly(path.code, () => !!this.data.plan);
      translatable(path.name, { required: true, maxLength: 60 });
      translatable(path.description, { maxLength: 500 });
      for (const quota of [
        ...LIMIT_KEYS.map((k) => path.limits[k]),
        path.statsHistory,
        path.guides,
      ]) {
        min(quota.value, 0);
        required(quota.value, { when: ({ valueOf }) => !valueOf(quota.unlimited) });
        disabled(quota.value, ({ valueOf }) => valueOf(quota.unlimited));
      }
    },
    {
      submission: {
        action: async (field) => {
          if (await this.data.save(field().value())) this.ref.close(true);
          return undefined;
        },
      },
    },
  );

  /** ngTemplateOutlet context is untyped: narrow it back. */
  protected asQuota(field: unknown): FieldTree<Quota> {
    return field as FieldTree<Quota>;
  }

  /** mat-checkbox has no Signal Forms integration: bind it by hand. */
  protected set(key: 'active' | 'isDefault', value: boolean): void {
    this.model.update((m) => ({ ...m, [key]: value }));
  }

  protected setFeature(key: (typeof FEATURE_KEYS)[number], value: boolean): void {
    this.model.update((m) => ({ ...m, features: { ...m.features, [key]: value } }));
  }
}
