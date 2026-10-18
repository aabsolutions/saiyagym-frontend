import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormField,
  applyEach,
  form,
  max,
  maxLength,
  min,
  required,
  schema,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { CopyProgramTemplateDto } from '../../api/models/copy-program-template-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { kgToLb, lbToKg } from '../../shared/units/units';
import { PROGRAM_LIMITS } from './program-draft';

export interface UseTemplateData {
  name: string;
  usesAutoProgression: boolean;
  maxNeeds: { exerciseId: string; name: string }[];
}

interface UseTemplateModel {
  name: string;
  maxes: { exerciseId: string; label: string; value: number | null }[];
}

/** Name + training maxes for %-based templates. Closes with the copy body, or nothing. */
@Component({
  selector: 'app-use-template-dialog',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'programs.templates.useTitle' | transloco }}</h2>
    <mat-dialog-content class="content">
      <p>{{ 'programs.templates.useMessage' | transloco }}</p>
      @if (data.usesAutoProgression && !auth.hasFeature('autoProgression')) {
        <p class="warn">
          <mat-icon aria-hidden="true">info</mat-icon>
          {{ 'programs.templates.progressionDropped' | transloco }}
        </p>
      }
      <mat-form-field class="full-width">
        <mat-label>{{ 'programs.wizard.name' | transloco }}</mat-label>
        <input matInput [formField]="useForm.name" />
        <mat-error>{{ useForm.name().errors() | validationMessage }}</mat-error>
      </mat-form-field>
      @if (data.maxNeeds.length) {
        <h3>{{ 'programs.wizard.maxesTitle' | transloco }}</h3>
        <p class="hint">{{ 'programs.wizard.maxesHint' | transloco }}</p>
        @for (m of useForm.maxes; track $index) {
          <mat-form-field class="full-width">
            <mat-label>{{ m().value().label }}</mat-label>
            <input matInput type="number" step="0.5" inputmode="decimal" [formField]="m.value" />
            <span matTextSuffix>{{ (imperial ? 'units.lb' : 'units.kg') | transloco }}</span>
            <mat-error>{{ m.value().errors() | validationMessage }}</mat-error>
          </mat-form-field>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-flat-button type="button" (click)="confirm()">
        {{ 'programs.templates.use' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
    }
    .warn {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      color: var(--mat-sys-on-surface-variant);
    }
    h3 {
      margin: 8px 0 0;
      font: var(--mat-sys-title-small);
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class UseTemplateDialog {
  protected readonly data = inject<UseTemplateData>(MAT_DIALOG_DATA);
  protected readonly auth = inject(AuthStore);
  private readonly ref = inject(MatDialogRef<UseTemplateDialog, CopyProgramTemplateDto>);
  protected readonly imperial = inject(PreferencesStore).units() === 'imperial';

  private readonly model = signal<UseTemplateModel>({
    name: this.data.name,
    maxes: this.data.maxNeeds.map((n) => ({
      exerciseId: n.exerciseId,
      label: n.name,
      value: null,
    })),
  });

  protected readonly useForm = form(
    this.model,
    schema<UseTemplateModel>((path) => {
      required(path.name);
      maxLength(path.name, PROGRAM_LIMITS.name);
      applyEach(path.maxes, (m) => {
        const toUnit = (kg: number) => (this.imperial ? Math.round(kgToLb(kg)) : kg);
        min(m.value, toUnit(PROGRAM_LIMITS.trainingMaxKgMin));
        max(m.value, toUnit(PROGRAM_LIMITS.trainingMaxKgMax));
      });
    }),
  );

  protected confirm(): void {
    this.useForm().markAsTouched();
    if (!this.useForm().valid()) return;
    const { name, maxes } = this.model();
    const trainingMaxes = maxes
      .filter((m) => m.value !== null && m.value > 0)
      .map((m) => ({
        exerciseId: m.exerciseId,
        kg: Math.round((this.imperial ? lbToKg(m.value!) : m.value!) * 100) / 100,
      }));
    this.ref.close({ name: name.trim(), ...(trainingMaxes.length && { trainingMaxes }) });
  }
}
