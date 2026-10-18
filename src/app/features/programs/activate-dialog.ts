import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { todayIso } from '../../shared/format/local-dates';

/** Asks for day 1 (the user's LOCAL date). Closes with the date, or nothing on cancel. */
@Component({
  selector: 'app-activate-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'programs.activate.title' | transloco: { name: data.name } }}</h2>
    <mat-dialog-content>
      <p>{{ 'programs.activate.message' | transloco }}</p>
      <mat-form-field class="full-width">
        <mat-label>{{ 'programs.wizard.startDate' | transloco }}</mat-label>
        <input
          matInput
          type="date"
          [value]="date()"
          (change)="date.set($any($event.target).value || date())"
        />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-flat-button type="button" [mat-dialog-close]="date()" cdkFocusInitial>
        {{ 'programs.list.activate' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ActivateDialog {
  protected readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);
  protected readonly date = signal(todayIso());
}
