import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlanRestriction } from '../../core/plans/entitlements';
import { UpgradeCta } from './upgrade-cta';

/** Opened by UpgradePrompt when the API answers PLAN_FEATURE_REQUIRED / PLAN_LIMIT_REACHED. */
@Component({
  selector: 'app-upgrade-dialog',
  imports: [MatButtonModule, MatDialogModule, TranslocoPipe, UpgradeCta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'plans.cta.dialogTitle' | transloco }}</h2>
    <mat-dialog-content>
      @switch (data.kind) {
        @case ('feature') {
          <app-upgrade-cta [feature]="data.feature" (navigated)="dialogRef.close()" />
        }
        @case ('limit') {
          <app-upgrade-cta
            [limit]="data.resource"
            [limitValue]="data.limit"
            (navigated)="dialogRef.close()"
          />
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.close' | transloco }}</button>
    </mat-dialog-actions>
  `,
})
export class UpgradeDialog {
  protected readonly data = inject<PlanRestriction>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<UpgradeDialog>);
}
