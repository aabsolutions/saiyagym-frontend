import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { firstValueFrom, last, tap } from 'rxjs';
import { API_PREFIX } from '../../core/http/api-request';
import { Notifier } from '../../core/notify/notifier';
import { ImageRejectedError, ImageUpload, UploadPurpose } from './image-upload';

/**
 * An image field whose file only goes to Cloudinary when the owning form is saved: picking
 * shows a local `blob:` preview; `uploadIfPending()` runs inside save. A cancelled form never
 * leaves an orphan upload. Create one per form (store) and `dispose()` it with the store.
 *
 * `messagesPrefix` holds `tooLarge`, `format` and `failed` keys.
 */
export class PendingImage {
  /** The image already stored (Cloudinary URL), or null. */
  readonly storedUrl = signal<string | null>(null);
  readonly pendingFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  /** 0–100 while uploading, null otherwise. */
  readonly uploadProgress = signal<number | null>(null);
  /** What the form shows: the picked file, else the stored image. */
  readonly shown = computed(() => this.previewUrl() ?? this.storedUrl());

  constructor(
    private readonly upload: ImageUpload,
    private readonly notifier: Notifier,
    private readonly purpose: UploadPurpose,
    private readonly messagesPrefix: string,
  ) {}

  /** Only a local preview: nothing reaches Cloudinary yet. */
  pick(file: File): void {
    this.clearPending();
    this.pendingFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  remove(): void {
    this.clearPending();
    this.storedUrl.set(null);
  }

  /**
   * Uploads the picked file, if any. Resolves to the URL to save (the stored one when nothing
   * was picked), or `undefined` when the upload failed (already reported: don't save).
   * After a successful upload the URL becomes the stored one, so a retry won't upload again.
   */
  async uploadIfPending(): Promise<string | null | undefined> {
    const file = this.pendingFile();
    if (!file) return this.storedUrl();
    this.uploadProgress.set(0);
    try {
      const done = await firstValueFrom(
        this.upload.upload(file, this.purpose).pipe(
          tap((event) => {
            if (event.type === 'progress') this.uploadProgress.set(event.percent);
          }),
          last(),
        ),
      );
      if (done.type !== 'done') return undefined;
      this.clearPending();
      this.storedUrl.set(done.image.secureUrl);
      return done.image.secureUrl;
    } catch (error) {
      reportUploadError(error, this.notifier, this.messagesPrefix);
      return undefined;
    } finally {
      this.uploadProgress.set(null);
    }
  }

  dispose(): void {
    this.clearPending();
  }

  private clearPending(): void {
    const preview = this.previewUrl();
    if (preview) URL.revokeObjectURL(preview);
    this.pendingFile.set(null);
    this.previewUrl.set(null);
  }
}

/**
 * Reports a failed signed upload. Errors from our API (e.g. MEDIA_NOT_CONFIGURED on the
 * signature) were already reported by errorInterceptor; Cloudinary's are not an API request,
 * so they are said here. `messagesPrefix` holds `tooLarge`, `format` and `failed` keys.
 */
export function reportUploadError(
  error: unknown,
  notifier: Notifier,
  messagesPrefix: string,
): void {
  const reportedByApi =
    error instanceof HttpErrorResponse && (error.url ?? '').includes(API_PREFIX);
  if (error instanceof ImageRejectedError) {
    notifier.info(`${messagesPrefix}.${error.reason}`);
  } else if (!reportedByApi) {
    notifier.info(`${messagesPrefix}.failed`);
  }
}
