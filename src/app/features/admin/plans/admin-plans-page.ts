import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlanResponseDto } from '../../../api/models/plan-response-dto';
import { AdminPlansService } from '../../../api/services/admin-plans.service';
import { FEATURE_KEYS, LIMIT_KEYS } from '../../../core/plans/entitlements';
import { Notifier } from '../../../core/notify/notifier';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import { PlanEditorData, PlanEditorDialog } from './plan-editor-dialog';
import { PlanFormModel, toCreatePlanDto, toUpdatePlanDto } from './plan-form';

/** Plans and their entitlements. The API is what enforces them (entitlements guard). */
@Component({
  selector: 'app-admin-plans-page',
  imports: [LocalizedPipe, MatButtonModule, MatCardModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <p class="hint">{{ 'admin.plans.hint' | transloco }}</p>
      <span class="spacer"></span>
      <button mat-flat-button type="button" (click)="open(null)">
        <mat-icon>add</mat-icon>{{ 'admin.plans.new' | transloco }}
      </button>
    </div>

    <div class="plans">
      @for (plan of plans(); track plan.id) {
        <mat-card appearance="outlined" class="plan">
          <header class="head">
            <h2>{{ plan.name | localized }}</h2>
            <span class="badge" [class.off]="!plan.active">{{
              (plan.active ? 'admin.plans.active' : 'admin.plans.inactive') | transloco
            }}</span>
            @if (plan.isDefault) {
              <span class="badge">{{ 'admin.plans.isDefault' | transloco }}</span>
            }
          </header>
          <p class="sub">{{ plan.code }}</p>
          <dl class="ents">
            @for (key of limitKeys; track key) {
              <div>
                <dt>{{ 'plans.limits.' + key | transloco }}</dt>
                <dd>
                  {{ plan.entitlements.limits[key] ?? ('admin.plans.unlimited' | transloco) }}
                </dd>
              </div>
            }
            <div>
              <dt>{{ 'admin.plans.statsDays' | transloco }}</dt>
              <dd>
                {{ plan.entitlements.statsHistoryDays ?? ('admin.plans.unlimited' | transloco) }}
              </dd>
            </div>
          </dl>
          <ul class="features">
            @for (key of featureKeys; track key) {
              @let on = plan.entitlements.features[key];
              <li [class.off]="!on">
                <mat-icon aria-hidden="true">{{ on ? 'check' : 'close' }}</mat-icon>
                <span class="cdk-visually-hidden">{{
                  (on ? 'admin.plans.included' : 'admin.plans.notIncluded') | transloco
                }}</span>
                {{ 'plans.features.' + key | transloco }}
              </li>
            }
          </ul>
          <div class="row-actions">
            <button mat-button type="button" [disabled]="plan.isDefault" (click)="remove(plan)">
              {{ 'admin.delete' | transloco }}
            </button>
            <button mat-stroked-button type="button" (click)="open(plan)">
              {{ 'admin.edit' | transloco }}
            </button>
          </div>
        </mat-card>
      } @empty {
        <p class="empty">{{ 'common.loading' | transloco }}</p>
      }
    </div>
  `,
  styleUrl: '../admin.scss',
  styles: `
    .plans {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      gap: 16px;
    }
    .plan {
      padding: 16px;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      h2 {
        margin: 0;
        font: var(--mat-sys-title-medium);
      }
    }
    .ents {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      margin: 12px 0;
      div {
        display: contents;
      }
      dd {
        margin: 0;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
    }
    .features {
      margin: 0;
      padding: 0;
      list-style: none;
      li {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      li.off {
        color: var(--mat-sys-on-surface-variant);
      }
      mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
      }
    }
  `,
})
export class AdminPlansPage {
  private readonly api = inject(AdminPlansService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);

  protected readonly limitKeys = LIMIT_KEYS;
  protected readonly featureKeys = FEATURE_KEYS;
  protected readonly plans = signal<PlanResponseDto[]>([]);

  constructor() {
    void this.load();
  }

  protected open(plan: PlanResponseDto | null): void {
    const data: PlanEditorData = { plan, save: (model) => this.save(plan, model) };
    this.dialog.open(PlanEditorDialog, { data, width: '640px', maxWidth: '95vw' });
  }

  protected remove(plan: PlanResponseDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.plans.deleteTitle',
      message: 'admin.plans.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe(async (ok) => {
        if (!ok) return;
        try {
          await this.api.adminPlansControllerRemove({ id: plan.id });
          this.notifier.info('admin.deleted');
          await this.load();
        } catch {
          // e.g. 409 PLAN_IS_DEFAULT, already shown.
        }
      });
  }

  private async save(plan: PlanResponseDto | null, model: PlanFormModel): Promise<boolean> {
    try {
      if (plan) {
        await this.api.adminPlansControllerUpdate({ id: plan.id, body: toUpdatePlanDto(model) });
      } else {
        await this.api.adminPlansControllerCreate({ body: toCreatePlanDto(model) });
      }
      this.notifier.info('common.saved');
      // Another plan may have lost `isDefault`: reload them all.
      await this.load();
      return true;
    } catch {
      return false;
    }
  }

  private async load(): Promise<void> {
    try {
      const plans = await this.api.adminPlansControllerFindAll();
      this.plans.set(plans.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      // errorInterceptor already reported it.
    }
  }
}
