import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { ValidationMessagePipe } from '../forms/validation-message.pipe';
import { UnitSystem } from '../units/units';
import { ProfileFormModel, SEXES, todayIso } from './profile-form';

/** Birth date, sex and height. Presentational: the parent owns the form and the save. */
@Component({
  selector: 'app-physical-fields',
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let f = fields();
    <mat-form-field>
      <mat-label>{{ 'profile.fields.birthDate' | transloco }}</mat-label>
      <input matInput type="date" [max]="today" [formField]="f.birthDate" />
      <mat-error>{{ f.birthDate().errors() | validationMessage }}</mat-error>
    </mat-form-field>

    <mat-form-field>
      <mat-label>{{ 'profile.fields.sex' | transloco }}</mat-label>
      <mat-select [formField]="f.sex">
        <mat-option [value]="null">{{ 'profile.notSet' | transloco }}</mat-option>
        @for (sex of sexes; track sex) {
          <mat-option [value]="sex">{{ 'profile.sex.' + sex | transloco }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    <mat-form-field>
      <mat-label>{{ 'profile.fields.height' | transloco }}</mat-label>
      <input matInput type="number" inputmode="decimal" step="0.1" [formField]="f.height" />
      <span matTextSuffix>{{ heightUnitKey() | transloco }}</span>
      <mat-error>{{ f.height().errors() | validationMessage }}</mat-error>
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
export class PhysicalFields {
  readonly fields = input.required<FieldTree<ProfileFormModel>>();
  readonly units = input.required<UnitSystem>();

  protected readonly sexes = SEXES;
  protected readonly today = todayIso();
  protected readonly heightUnitKey = computed(() =>
    this.units() === 'imperial' ? 'units.in' : 'units.cm',
  );
}
