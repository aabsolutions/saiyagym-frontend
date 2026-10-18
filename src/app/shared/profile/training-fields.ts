import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { ValidationMessagePipe } from '../forms/validation-message.pipe';
import { GOALS, LEVELS, ProfileFormModel } from './profile-form';

/** Training level and goal. Presentational: the parent owns the form and the save. */
@Component({
  selector: 'app-training-fields',
  imports: [FormField, MatFormFieldModule, MatSelectModule, TranslocoPipe, ValidationMessagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let f = fields();
    <mat-form-field>
      <mat-label>{{ 'profile.fields.level' | transloco }}</mat-label>
      <mat-select [formField]="f.level">
        @if (allowEmpty()) {
          <mat-option [value]="null">{{ 'profile.notSet' | transloco }}</mat-option>
        }
        @for (level of levels; track level) {
          <mat-option [value]="level">{{ 'profile.level.' + level | transloco }}</mat-option>
        }
      </mat-select>
      <mat-error>{{ f.level().errors() | validationMessage }}</mat-error>
    </mat-form-field>

    <mat-form-field>
      <mat-label>{{ 'profile.fields.goal' | transloco }}</mat-label>
      <mat-select [formField]="f.goal">
        @if (allowEmpty()) {
          <mat-option [value]="null">{{ 'profile.notSet' | transloco }}</mat-option>
        }
        @for (goal of goals; track goal) {
          <mat-option [value]="goal">{{ 'profile.goal.' + goal | transloco }}</mat-option>
        }
      </mat-select>
      <mat-error>{{ f.goal().errors() | validationMessage }}</mat-error>
    </mat-form-field>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0 16px;
    }
  `,
})
export class TrainingFields {
  readonly fields = input.required<FieldTree<ProfileFormModel>>();
  readonly allowEmpty = input(true);

  protected readonly levels = LEVELS;
  protected readonly goals = GOALS;
}
