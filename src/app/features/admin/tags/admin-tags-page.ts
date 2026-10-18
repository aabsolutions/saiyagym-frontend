import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminExerciseTagDto } from '../../../api/models/admin-exercise-tag-dto';
import { AdminExercisesService } from '../../../api/services/admin-exercises.service';
import { Notifier } from '../../../core/notify/notifier';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { Translatable, toTranslatable } from '../../../shared/i18n/translatable';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import { TagDialog, TagDialogData } from './tag-dialog';

/** Free exercise tags ("básico", "unilateral"…), translatable. */
@Component({
  selector: 'app-admin-tags-page',
  imports: [LocalizedPipe, MatButtonModule, MatCardModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <span class="spacer"></span>
      <button mat-flat-button type="button" (click)="open(null)">
        <mat-icon>add</mat-icon>{{ 'admin.tags.new' | transloco }}
      </button>
    </div>
    <mat-card appearance="outlined" class="card">
      <div class="scroll">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.tags' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.fields.name' | transloco }}</th>
              <th scope="col">{{ 'admin.fields.slug' | transloco }}</th>
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (tag of tags(); track tag.id) {
              @let name = tag.name | localized;
              <tr>
                <th scope="row">{{ name }}</th>
                <td>{{ tag.slug }}</td>
                <td class="actions-cell">
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.editItem' | transloco: { name }"
                    (click)="open(tag)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.deleteItem' | transloco: { name }"
                    (click)="remove(tag)"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="empty">{{ 'admin.empty' | transloco }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </mat-card>
  `,
  styleUrl: '../admin.scss',
})
export class AdminTagsPage {
  private readonly api = inject(AdminExercisesService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  protected readonly tags = signal<AdminExerciseTagDto[]>([]);

  constructor() {
    void this.load();
  }

  protected open(tag: AdminExerciseTagDto | null): void {
    const data: TagDialogData = {
      tag,
      save: (slug, name) => this.save(tag, slug, name),
    };
    this.dialog.open(TagDialog, { data, width: '480px', maxWidth: '95vw' });
  }

  protected remove(tag: AdminExerciseTagDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.tags.deleteTitle',
      message: 'admin.tags.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe(async (ok) => {
        if (!ok) return;
        try {
          await this.api.adminExerciseTagsControllerRemove({ id: tag.id });
          this.notifier.info('admin.deleted');
          await this.load();
        } catch {
          // errorInterceptor already reported it.
        }
      });
  }

  private async save(
    tag: AdminExerciseTagDto | null,
    slug: string,
    name: Translatable,
  ): Promise<boolean> {
    try {
      if (tag) {
        await this.api.adminExerciseTagsControllerUpdate({
          id: tag.id,
          body: { name: toTranslatable(name) },
        });
      } else {
        await this.api.adminExerciseTagsControllerCreate({
          body: { slug, name: toTranslatable(name) },
        });
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
      this.tags.set(await this.api.adminExerciseTagsControllerList());
    } catch {
      // errorInterceptor already reported it.
    }
  }
}
