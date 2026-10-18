import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  max,
  maxLength,
  min,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { BodyMetricDto } from '../../api/models/body-metric-dto';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { todayIso } from '../../shared/format/local-dates';
import { UnitSystem } from '../../shared/units/units';
import {
  MEASUREMENT_FIELDS,
  MeasurementField,
  MeasurementFormModel,
  NOTES_MAX,
  boundsIn,
  hasAnyMeasurement,
  kindOf,
  toFormModel,
} from './measurements-model';

export interface MeasurementDialogData {
  /** null = new entry. */
  metric: BodyMetricDto | null;
  /** Pinned when the dialog opens: values are typed in this unit. */
  units: UnitSystem;
  /** Resolves true once saved; the dialog stays open (with the input) on failure. */
  save: (model: MeasurementFormModel) => Promise<boolean>;
}

@Component({
  selector: 'app-measurement-dialog',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ (data.metric ? 'body.dialog.editTitle' : 'body.dialog.newTitle') | transloco }}
    </h2>
    <form [formRoot]="measurementForm">
      <mat-dialog-content>
        <mat-form-field class="date">
          <mat-label>{{ 'body.dialog.date' | transloco }}</mat-label>
          <input matInput type="date" [max]="today" [formField]="measurementForm.date" />
          <mat-error>{{ measurementForm.date().errors() | validationMessage }}</mat-error>
        </mat-form-field>

        <p class="hint">{{ 'body.dialog.hint' | transloco }}</p>
        <div class="grid">
          @for (field of fields; track field) {
            @let control = measurementForm.values[field];
            <mat-form-field>
              <mat-label>{{ 'body.fields.' + field | transloco }}</mat-label>
              <input matInput type="number" inputmode="decimal" step="0.1" [formField]="control" />
              <span matTextSuffix>{{ unitKey(field) | transloco }}</span>
              <mat-error>{{ control().errors() | validationMessage }}</mat-error>
            </mat-form-field>
          }
        </div>
        @if (measurementForm.values().touched() && measurementForm.values().errors().length) {
          <p class="error" role="alert">
            {{ measurementForm.values().errors() | validationMessage }}
          </p>
        }

        <mat-form-field class="full-width">
          <mat-label>{{ 'body.dialog.notes' | transloco }}</mat-label>
          <textarea matInput rows="2" [formField]="measurementForm.notes"></textarea>
          <mat-error>{{ measurementForm.notes().errors() | validationMessage }}</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button type="submit" [disabled]="measurementForm().submitting()">
          {{ 'common.save' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .date {
      width: 100%;
      max-width: 240px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0 12px;
    }
    .hint {
      margin: 0 0 8px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .error {
      margin: 0 0 12px;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class MeasurementDialog {
  protected readonly data = inject<MeasurementDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MeasurementDialog>);

  protected readonly fields = MEASUREMENT_FIELDS;
  protected readonly today = todayIso();
  private readonly model = signal(toFormModel(this.data.metric, this.data.units));

  protected readonly measurementForm = form(
    this.model,
    (path) => {
      required(path.date);
      validate(path.date, ({ value }) =>
        value() > todayIso() ? { kind: 'futureDate' } : undefined,
      );
      for (const field of MEASUREMENT_FIELDS) {
        const bounds = boundsIn(field, this.data.units);
        min(path.values[field], bounds.min);
        max(path.values[field], bounds.max);
      }
      validate(path.values, ({ value }) =>
        hasAnyMeasurement(value()) ? undefined : { kind: 'noMeasurement' },
      );
      maxLength(path.notes, NOTES_MAX);
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

  protected unitKey(field: MeasurementField): string {
    const kind = kindOf(field);
    if (kind === 'percent') return 'units.percent';
    const imperial = this.data.units === 'imperial';
    return kind === 'weight'
      ? imperial
        ? 'units.lb'
        : 'units.kg'
      : imperial
        ? 'units.in'
        : 'units.cm';
  }
}
