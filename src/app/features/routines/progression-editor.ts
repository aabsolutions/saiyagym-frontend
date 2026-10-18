import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { UnitSystem } from '../../shared/units/units';
import { DraftProgression, ProgressionKind } from './routine-draft';

const KINDS: readonly ProgressionKind[] = ['none', 'double_progression', 'percent_1rm'];

/**
 * Automatic progression rule of one routine exercise (Premium). Presentational: field edits
 * go straight to the form model; adding/removing weeks is asked to the parent.
 */
@Component({
  selector: 'app-progression-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = rule();
    <mat-form-field subscriptSizing="dynamic" class="kind">
      <mat-label>{{ 'routines.progression.title' | transloco }}</mat-label>
      <mat-select [formField]="p.kind">
        @for (k of kinds; track k) {
          <mat-option [value]="k">{{ 'routines.progression.kind.' + k | transloco }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    @switch (p.kind().value()) {
      @case ('double_progression') {
        <p class="hint">{{ 'routines.progression.doubleHint' | transloco }}</p>
        <div class="row">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>{{ 'routines.progression.increment' | transloco }}</mat-label>
            <input
              matInput
              type="number"
              step="0.25"
              inputmode="decimal"
              [formField]="p.increment"
            />
            <span matTextSuffix>{{ unitKey() | transloco }}</span>
            <mat-hint>{{ 'routines.progression.defaultHint' | transloco }}</mat-hint>
            <mat-error>{{ p.increment().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>{{ 'routines.progression.rounding' | transloco }}</mat-label>
            <input
              matInput
              type="number"
              step="0.25"
              inputmode="decimal"
              [formField]="p.rounding"
            />
            <span matTextSuffix>{{ unitKey() | transloco }}</span>
            <mat-error>{{ p.rounding().errors() | validationMessage }}</mat-error>
          </mat-form-field>
        </div>
      }
      @case ('percent_1rm') {
        <p class="hint">{{ 'routines.progression.percentHint' | transloco }}</p>
        <ol class="weeks">
          @for (week of p.weeks; track $index) {
            <li>
              <span class="week">{{
                'routines.progression.week' | transloco: { n: $index + 1 }
              }}</span>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ 'routines.progression.percent' | transloco }}</mat-label>
                <input matInput type="number" inputmode="numeric" [formField]="week.percent" />
                <mat-error>{{ week.percent().errors() | validationMessage }}</mat-error>
              </mat-form-field>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ 'routines.progression.reps' | transloco }}</mat-label>
                <input matInput type="number" inputmode="numeric" [formField]="week.reps" />
                <mat-error>{{ week.reps().errors() | validationMessage }}</mat-error>
              </mat-form-field>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ 'routines.progression.sets' | transloco }}</mat-label>
                <input matInput type="number" inputmode="numeric" [formField]="week.sets" />
                <mat-error>{{ week.sets().errors() | validationMessage }}</mat-error>
              </mat-form-field>
              <button
                mat-icon-button
                type="button"
                [attr.aria-label]="'routines.progression.removeWeek' | transloco: { n: $index + 1 }"
                (click)="weekRemoved.emit($index)"
              >
                <mat-icon>remove_circle_outline</mat-icon>
              </button>
            </li>
          }
        </ol>
        @if (p.weeks().errors().length) {
          <p class="error" role="alert">{{ p.weeks().errors() | validationMessage }}</p>
        }
        <button mat-button type="button" (click)="weekAdded.emit()">
          <mat-icon>add</mat-icon>
          {{ 'routines.progression.addWeek' | transloco }}
        </button>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .kind {
      max-width: 280px;
    }
    .row,
    .weeks li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .row mat-form-field {
      width: 160px;
    }
    .weeks {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
      mat-form-field {
        width: 96px;
      }
    }
    .week {
      min-width: 72px;
      font: var(--mat-sys-label-large);
    }
    .hint {
      margin: 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class ProgressionEditor {
  readonly rule = input.required<FieldTree<DraftProgression>>();
  readonly units = input.required<UnitSystem>();
  readonly weekAdded = output<void>();
  readonly weekRemoved = output<number>();

  protected readonly kinds = KINDS;
  protected readonly unitKey = computed(() =>
    this.units() === 'imperial' ? 'units.lb' : 'units.kg',
  );
}
