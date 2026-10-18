import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProgressPhotoDto } from '../../api/models/progress-photo-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { PhotoCompare } from './photo-compare';
import { PhotoUploadDialog, PhotoUploadDialogData } from './photo-upload-dialog';
import { PHOTO_VIEWS, PhotoView, PhotosStore, groupByDay } from './photos.store';

@Component({
  selector: 'app-photos-page',
  imports: [
    LocalDatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    PhotoCompare,
    TranslocoPipe,
    UpgradeCta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photos-page.html',
  styleUrl: './photos-page.scss',
})
export class PhotosPage {
  protected readonly store = inject(PhotosStore);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);

  protected readonly views = PHOTO_VIEWS;
  /** Upload needs Premium; existing photos stay visible (and deletable) after a downgrade. */
  protected readonly canUpload = computed(() => this.auth.hasFeature('progressPhotos'));
  protected readonly days = computed(() => groupByDay(this.store.items()));

  /** Photos of the compared view, oldest first (the before/after pickers). */
  protected readonly viewPhotos = computed(() => {
    const view = this.store.compareView();
    const compare = this.store.compare();
    // The API's earliest photo may be older than the pages loaded so far.
    const byId = new Map(
      [...this.store.items(), compare?.before, compare?.after]
        .filter((p): p is ProgressPhotoDto => !!p && p.view === view)
        .map((p) => [p.id, p]),
    );
    return [...byId.values()].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  });
  /** The user's picks; null = the API's default (earliest vs latest). */
  protected readonly beforeId = signal<string | null>(null);
  protected readonly afterId = signal<string | null>(null);

  protected readonly before = computed(() =>
    this.pick(this.beforeId(), this.store.compare()?.before),
  );
  protected readonly after = computed(() => this.pick(this.afterId(), this.store.compare()?.after));

  protected setView(view: PhotoView): void {
    this.beforeId.set(null);
    this.afterId.set(null);
    void this.store.setCompareView(view);
  }

  protected openUpload(): void {
    const data: PhotoUploadDialogData = {
      progress: () => this.store.uploadPercent(),
      save: (photo) => this.store.add(photo),
    };
    this.dialog.open(PhotoUploadDialog, { data, width: '480px', maxWidth: '95vw' });
  }

  protected remove(photo: ProgressPhotoDto): void {
    const data: ConfirmDialogData = {
      title: 'body.photos.deleteTitle',
      message: 'body.photos.deleteMessage',
      confirm: 'body.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        if (this.beforeId() === photo.id) this.beforeId.set(null);
        if (this.afterId() === photo.id) this.afterId.set(null);
        void this.store.remove(photo.id);
      });
  }

  private pick(id: string | null, fallback: ProgressPhotoDto | null | undefined) {
    return (id ? this.viewPhotos().find((p) => p.id === id) : null) ?? fallback ?? null;
  }
}
