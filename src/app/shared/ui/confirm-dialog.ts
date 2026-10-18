import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';

export interface ConfirmDialogData {
  /** Translation keys. */
  title: string;
  message: string;
  confirm: string;
  danger?: boolean;
}

/** Yes/no confirmation. `afterClosed()` emits true only when confirmed. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title | transloco }}</h2>
    <mat-dialog-content>
      <p>{{ data.message | transloco }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">
        {{ 'common.cancel' | transloco }}
      </button>
      <button
        mat-flat-button
        type="button"
        [class.danger]="data.danger"
        [mat-dialog-close]="true"
        cdkFocusInitial
      >
        {{ data.confirm | transloco }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
