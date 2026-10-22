import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, from, of, switchMap, tap } from 'rxjs';
import { AdminRestSoundDto } from '../../../api/models/admin-rest-sound-dto';
import { AdminRestSoundPageDto } from '../../../api/models/admin-rest-sound-page-dto';
import { AdminSoundsService } from '../../../api/services/admin-sounds.service';
import { Notifier } from '../../../core/notify/notifier';
import { localizeText } from '../../../shared/i18n/translatable';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import { SoundDialog, SoundDialogData, SoundSaveResult } from './sound-dialog';
import {
  SoundFormModel,
  formatKilobytes,
  formatSeconds,
  invalidSoundReasonKey,
  toCreateSoundDto,
  toUpdateSoundDto,
} from './sound-forms';

const PAGE_SIZE = 25;

/** Rest-alarm sound library (admin). Soft delete: the slug stays reserved. */
@Component({
  selector: 'app-admin-sounds-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatPaginatorModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <span class="spacer"></span>
      <button mat-flat-button type="button" (click)="open(null)">
        <mat-icon>add</mat-icon>{{ 'admin.sounds.new' | transloco }}
      </button>
    </div>

    <mat-card appearance="outlined" class="card">
      <div class="scroll" [class.pending]="pending()">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.sounds' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.fields.name' | transloco }}</th>
              <th scope="col">{{ 'admin.sounds.access' | transloco }}</th>
              <th scope="col">{{ 'admin.sounds.duration' | transloco }}</th>
              <th scope="col">{{ 'admin.sounds.size' | transloco }}</th>
              <th scope="col">{{ 'admin.sounds.preview' | transloco }}</th>
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (sound of page()?.items ?? []; track sound.id) {
              @let name = nameOf(sound);
              <tr>
                <th scope="row">
                  {{ name }}
                  <span class="sub">{{ sound.slug }}</span>
                </th>
                <td>
                  <span class="badge" [class.off]="sound.access === 'free'">
                    {{ 'admin.sounds.accessValues.' + sound.access | transloco }}
                  </span>
                </td>
                <td class="num">{{ seconds(sound.durationSec) }}</td>
                <td class="num">{{ kilobytes(sound.bytes) }}</td>
                <td>
                  @if (sound.mp3Url) {
                    <audio
                      controls
                      preload="none"
                      [src]="sound.mp3Url"
                      [attr.aria-label]="'admin.sounds.previewOf' | transloco: { name }"
                    ></audio>
                  }
                </td>
                <td class="actions-cell">
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.editItem' | transloco: { name }"
                    (click)="open(sound)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.deleteItem' | transloco: { name }"
                    (click)="remove(sound)"
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
      <mat-paginator
        [length]="page()?.meta?.total ?? 0"
        [pageIndex]="query().page - 1"
        [pageSize]="pageSize"
        [hidePageSize]="true"
        (page)="onPage($event)"
      />
    </mat-card>
  `,
  styleUrl: '../admin.scss',
  styles: `
    audio {
      height: 36px;
      max-width: 240px;
    }
  `,
})
export class AdminSoundsPage {
  private readonly api = inject(AdminSoundsService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly transloco = inject(TranslocoService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly seconds = formatSeconds;
  protected readonly kilobytes = formatKilobytes;
  protected readonly query = signal({ page: 1, revision: 0 });
  protected readonly pending = signal(false);
  protected readonly page = toSignal(
    toObservable(this.query).pipe(
      tap(() => this.pending.set(true)),
      switchMap(({ page }) =>
        from(this.api.adminSoundsControllerList({ page, limit: PAGE_SIZE })).pipe(
          catchError(() => of<AdminRestSoundPageDto | null>(null)),
        ),
      ),
      tap(() => this.pending.set(false)),
    ),
    { initialValue: null },
  );

  protected nameOf(sound: AdminRestSoundDto): string {
    return localizeText(sound.name, this.transloco.getActiveLang()) || sound.slug;
  }

  protected onPage(event: PageEvent): void {
    this.query.update((q) => ({ ...q, page: event.pageIndex + 1 }));
  }

  protected open(sound: AdminRestSoundDto | null): void {
    const data: SoundDialogData = {
      sound,
      save: (model, publicId) => this.save(sound, model, publicId),
    };
    this.dialog.open(SoundDialog, { data, width: '640px', maxWidth: '95vw' });
  }

  protected remove(sound: AdminRestSoundDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.sounds.deleteTitle',
      message: 'admin.sounds.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe(async (ok) => {
        if (!ok) return;
        try {
          await this.api.adminSoundsControllerRemove({ id: sound.id });
          this.notifier.info('admin.deleted');
          this.refresh();
        } catch {
          // errorInterceptor already reported it.
        }
      });
  }

  private async save(
    sound: AdminRestSoundDto | null,
    model: SoundFormModel,
    publicId: string | undefined,
  ): Promise<SoundSaveResult> {
    try {
      if (sound) {
        await this.api.adminSoundsControllerUpdate({
          id: sound.id,
          body: toUpdateSoundDto(model, publicId),
        });
      } else {
        // The dialog guarantees an uploaded file when creating.
        await this.api.adminSoundsControllerCreate({
          body: toCreateSoundDto(model, publicId ?? ''),
        });
      }
      this.notifier.info('common.saved');
      this.refresh();
      return { ok: true };
    } catch (error) {
      return { ok: false, reasonKey: invalidSoundReasonKey(error) };
    }
  }

  private refresh(): void {
    this.query.update((q) => ({ ...q, revision: q.revision + 1 }));
  }
}
