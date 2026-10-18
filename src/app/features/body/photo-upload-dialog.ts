import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslocoPipe } from '@jsverse/transloco';
import { todayIso } from '../../shared/format/local-dates';
import { NewPhoto, PHOTO_VIEWS, PhotoView } from './photos.store';

export interface PhotoUploadDialogData {
  /** 0–100 while uploading, null otherwise (read from the store). */
  progress: () => number | null;
  save: (photo: NewPhoto) => Promise<boolean>;
}

@Component({
  selector: 'app-photo-upload-dialog',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'body.photos.uploadTitle' | transloco }}</h2>
    <mat-dialog-content>
      <div class="pick">
        @if (preview(); as src) {
          <img class="preview" [src]="src" [alt]="'body.photos.preview' | transloco" />
        } @else {
          <div class="placeholder"><mat-icon>add_a_photo</mat-icon></div>
        }
        <input
          #fileInput
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          hidden
          (change)="pick($any($event.target).files?.[0] ?? null)"
        />
        <button mat-stroked-button type="button" (click)="fileInput.click()">
          {{ (file() ? 'body.photos.change' : 'body.photos.choose') | transloco }}
        </button>
      </div>

      <p class="label">{{ 'body.photos.view' | transloco }}</p>
      <mat-button-toggle-group
        hideSingleSelectionIndicator
        [value]="view()"
        [attr.aria-label]="'body.photos.view' | transloco"
        (change)="view.set($event.value)"
      >
        @for (v of views; track v) {
          <mat-button-toggle [value]="v">{{
            'body.photos.views.' + v | transloco
          }}</mat-button-toggle>
        }
      </mat-button-toggle-group>

      <mat-form-field class="date">
        <mat-label>{{ 'body.dialog.date' | transloco }}</mat-label>
        <input
          matInput
          type="date"
          [max]="today"
          [value]="date()"
          (change)="date.set($any($event.target).value || date())"
        />
      </mat-form-field>

      <mat-form-field class="full-width">
        <mat-label>{{ 'body.dialog.notes' | transloco }}</mat-label>
        <textarea
          matInput
          rows="2"
          maxlength="1000"
          [value]="notes()"
          (input)="notes.set($any($event.target).value)"
        ></textarea>
      </mat-form-field>

      <p class="private">
        <mat-icon aria-hidden="true">lock</mat-icon>{{ 'body.photos.private' | transloco }}
      </p>
      @if (data.progress(); as percent) {
        <mat-progress-bar mode="determinate" [value]="percent" />
      } @else if (saving()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="saving()">
        {{ 'common.cancel' | transloco }}
      </button>
      <button mat-flat-button type="button" [disabled]="!canSave()" (click)="save()">
        {{ 'body.photos.upload' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .pick {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .preview,
    .placeholder {
      width: 180px;
      aspect-ratio: 3 / 4;
      border-radius: var(--mat-sys-corner-medium);
      object-fit: cover;
      background: var(--mat-sys-surface-container-high);
    }
    .placeholder {
      display: grid;
      place-items: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .label {
      margin: 0 0 4px;
      font: var(--mat-sys-label-large);
    }
    .date {
      display: block;
      max-width: 240px;
      margin-top: 16px;
    }
    .private {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 8px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .private mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
  `,
})
export class PhotoUploadDialog {
  protected readonly data = inject<PhotoUploadDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PhotoUploadDialog>);

  protected readonly views = PHOTO_VIEWS;
  protected readonly today = todayIso();
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly view = signal<PhotoView>('front');
  protected readonly date = signal(todayIso());
  protected readonly notes = signal('');
  protected readonly saving = signal(false);
  protected readonly canSave = computed(
    () => !!this.file() && !this.saving() && this.date() <= this.today,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokePreview());
  }

  protected pick(file: File | null): void {
    this.revokePreview();
    this.file.set(file);
    this.preview.set(file ? URL.createObjectURL(file) : null);
  }

  protected async save(): Promise<void> {
    const file = this.file();
    if (!file) return;
    this.saving.set(true);
    this.ref.disableClose = true;
    const ok = await this.data.save({
      file,
      view: this.view(),
      date: this.date(),
      notes: this.notes(),
    });
    this.saving.set(false);
    this.ref.disableClose = false;
    if (ok) this.ref.close(true);
  }

  private revokePreview(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
  }
}
