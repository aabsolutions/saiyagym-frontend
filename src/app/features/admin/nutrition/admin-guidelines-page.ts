import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminGuidelineDto } from '../../../api/models/admin-guideline-dto';
import { AdminNutritionService } from '../../../api/services/admin-nutrition.service';
import { Notifier } from '../../../core/notify/notifier';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import { GuidelineDialog, GuidelineDialogData } from './guideline-dialog';
import { GuidelineFormModel, toCreateGuidelineDto, toUpdateGuidelineDto } from './nutrition-forms';

@Component({
  selector: 'app-admin-guidelines-page',
  imports: [LocalizedPipe, MatButtonModule, MatCardModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <span class="spacer"></span>
      <button mat-flat-button type="button" (click)="open(null)">
        <mat-icon>add</mat-icon>{{ 'admin.guidelines.new' | transloco }}
      </button>
    </div>
    <mat-card appearance="outlined" class="card">
      <div class="scroll">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.guidelines' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.fields.title' | transloco }}</th>
              <th scope="col">{{ 'admin.guidelines.goals' | transloco }}</th>
              <th scope="col" class="num">{{ 'admin.fields.sortOrder' | transloco }}</th>
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (g of guidelines(); track g.id) {
              @let title = g.title | localized;
              <tr>
                <th scope="row">
                  {{ title }}<span class="sub">{{ g.summary | localized }}</span>
                </th>
                <td>
                  @for (goal of g.goals; track goal; let last = $last) {
                    {{ 'nutrition.goals.' + goal | transloco }}{{ last ? '' : ', ' }}
                  }
                </td>
                <td class="num">{{ g.sortOrder }}</td>
                <td class="actions-cell">
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.editItem' | transloco: { name: title }"
                    (click)="open(g)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.deleteItem' | transloco: { name: title }"
                    (click)="remove(g)"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty">{{ 'admin.empty' | transloco }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </mat-card>
  `,
  styleUrl: '../admin.scss',
})
export class AdminGuidelinesPage {
  private readonly api = inject(AdminNutritionService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  protected readonly guidelines = signal<AdminGuidelineDto[]>([]);

  constructor() {
    void this.load();
  }

  protected open(guideline: AdminGuidelineDto | null): void {
    const data: GuidelineDialogData = { guideline, save: (m) => this.save(guideline, m) };
    this.dialog.open(GuidelineDialog, { data, width: '720px', maxWidth: '95vw' });
  }

  protected remove(guideline: AdminGuidelineDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.guidelines.deleteTitle',
      message: 'admin.guidelines.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe(async (ok) => {
        if (!ok) return;
        try {
          await this.api.adminGuidelinesControllerRemove({ id: guideline.id });
          this.notifier.info('admin.deleted');
          await this.load();
        } catch {
          // errorInterceptor already reported it.
        }
      });
  }

  private async save(g: AdminGuidelineDto | null, model: GuidelineFormModel): Promise<boolean> {
    try {
      if (g) {
        await this.api.adminGuidelinesControllerUpdate({
          id: g.id,
          body: toUpdateGuidelineDto(model),
        });
      } else {
        await this.api.adminGuidelinesControllerCreate({ body: toCreateGuidelineDto(model) });
      }
      this.notifier.info('common.saved');
      await this.load();
      return true;
    } catch {
      return false;
    }
  }

  private async load(): Promise<void> {
    try {
      const list = await this.api.adminGuidelinesControllerList();
      this.guidelines.set(list.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      // errorInterceptor already reported it.
    }
  }
}
