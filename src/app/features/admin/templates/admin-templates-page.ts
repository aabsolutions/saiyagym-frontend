import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminProgramTemplateDto } from '../../../api/models/admin-program-template-dto';
import { AdminProgramsService } from '../../../api/services/admin-programs.service';
import { Notifier } from '../../../core/notify/notifier';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';

@Component({
  selector: 'app-admin-templates-page',
  imports: [
    LocalizedPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <p class="hint">{{ 'admin.templates.hint' | transloco }}</p>
      <span class="spacer"></span>
      <a mat-flat-button routerLink="/admin/templates/new">
        <mat-icon>add</mat-icon>{{ 'admin.templates.new' | transloco }}
      </a>
    </div>
    <mat-card appearance="outlined" class="card">
      <div class="scroll">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.templates' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.fields.name' | transloco }}</th>
              <th scope="col">{{ 'admin.templates.goal' | transloco }}</th>
              <th scope="col">{{ 'admin.templates.level' | transloco }}</th>
              <th scope="col" class="num">{{ 'admin.templates.weeks' | transloco }}</th>
              <th scope="col">{{ 'admin.templates.state' | transloco }}</th>
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (t of templates(); track t.id) {
              @let name = t.name | localized;
              <tr>
                <th scope="row">
                  {{ name }}<span class="sub">{{ t.slug }}</span>
                </th>
                <td>{{ 'profile.goal.' + t.goal | transloco }}</td>
                <td>{{ 'profile.level.' + t.level | transloco }}</td>
                <td class="num">{{ t.durationWeeks }}</td>
                <td>
                  <span class="badge" [class.off]="t.active === false">{{
                    (t.active === false ? 'admin.plans.inactive' : 'admin.plans.active') | transloco
                  }}</span>
                </td>
                <td class="actions-cell">
                  <a
                    mat-icon-button
                    [routerLink]="['/admin/templates', t.id]"
                    [attr.aria-label]="'admin.editItem' | transloco: { name }"
                  >
                    <mat-icon>edit</mat-icon>
                  </a>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.deleteItem' | transloco: { name }"
                    (click)="remove(t)"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">{{ 'admin.empty' | transloco }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </mat-card>
  `,
  styleUrl: '../admin.scss',
})
export class AdminTemplatesPage {
  private readonly api = inject(AdminProgramsService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  protected readonly templates = signal<AdminProgramTemplateDto[]>([]);

  constructor() {
    void this.load();
  }

  protected remove(template: AdminProgramTemplateDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.templates.deleteTitle',
      message: 'admin.templates.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe(async (ok) => {
        if (!ok) return;
        try {
          await this.api.adminProgramTemplatesControllerRemove({ id: template.id });
          this.notifier.info('admin.deleted');
          await this.load();
        } catch {
          // errorInterceptor already reported it.
        }
      });
  }

  private async load(): Promise<void> {
    try {
      const list = await this.api.adminProgramTemplatesControllerList();
      this.templates.set(list.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    } catch {
      // errorInterceptor already reported it.
    }
  }
}
