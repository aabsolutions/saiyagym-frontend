import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminUserDto } from '../../../api/models/admin-user-dto';
import { AssignPlanDto } from '../../../api/models/assign-plan-dto';
import { PlanResponseDto } from '../../../api/models/plan-response-dto';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { fromIso, todayIso } from '../../../shared/format/local-dates';

export interface AssignPlanDialogData {
  user: AdminUserDto;
  plans: PlanResponseDto[];
  save: (body: AssignPlanDto) => Promise<boolean>;
}

/** No payment gateway yet (SPEC): the admin assigns the plan, optionally until a date. */
@Component({
  selector: 'app-assign-plan-dialog',
  imports: [
    LocalizedPipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ 'admin.users.assignTitle' | transloco: { email: data.user.email } }}
    </h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>{{ 'admin.users.plan' | transloco }}</mat-label>
        <mat-select [value]="planId()" (valueChange)="planId.set($event)" required>
          @for (plan of activePlans(); track plan.id) {
            <mat-option [value]="plan.id">{{ plan.name | localized }} ({{ plan.code }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field class="full-width">
        <mat-label>{{ 'admin.users.until' | transloco }}</mat-label>
        <input
          matInput
          type="date"
          [min]="today"
          [value]="until()"
          (change)="until.set($any($event.target).value)"
        />
        <mat-hint>{{ 'admin.users.untilHint' | transloco }}</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-flat-button type="button" [disabled]="!planId() || saving()" (click)="save()">
        {{ 'admin.users.assign' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
})
export class AssignPlanDialog {
  protected readonly data = inject<AssignPlanDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<AssignPlanDialog>);

  protected readonly today = todayIso();
  protected readonly activePlans = computed(() => this.data.plans.filter((p) => p.active));
  protected readonly planId = signal(this.data.user.subscription.planId);
  protected readonly until = signal(
    this.data.user.subscription.currentPeriodEnd
      ? todayIso(new Date(this.data.user.subscription.currentPeriodEnd))
      : '',
  );
  protected readonly saving = signal(false);

  protected async save(): Promise<void> {
    const planId = this.planId();
    if (!planId) return;
    this.saving.set(true);
    // "Until" a local day = through the end of it.
    const until = this.until();
    const end = until ? fromIso(until) : null;
    end?.setHours(23, 59, 59, 999);
    const ok = await this.data.save({ planId, currentPeriodEnd: end ? end.toISOString() : null });
    this.saving.set(false);
    if (ok) this.ref.close(true);
  }
}
