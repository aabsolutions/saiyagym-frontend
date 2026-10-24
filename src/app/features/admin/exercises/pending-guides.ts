import { computed, signal } from '@angular/core';
import { firstValueFrom, last, tap } from 'rxjs';
import { AdminExerciseGuideDto } from '../../../api/models/admin-exercise-guide-dto';
import { apiErrorCode } from '../../../core/http/api-error';
import { Notifier } from '../../../core/notify/notifier';
import { Translatable } from '../../../shared/i18n/translatable';
import { ImageUpload } from '../../../shared/media/image-upload';
import { reportUploadError } from '../../../shared/media/pending-image';
import {
  GUIDE_LIMITS,
  GuideDraft,
  captionIssues,
  fromStoredGuide,
  invalidGuideReasonKey,
  moveDraft,
  sameGuides,
} from './guide-drafts';

const MESSAGES = 'admin.exercises.guides';

/**
 * The guide list of the exercise being edited. Like `PendingImage`, picked files only go to
 * Cloudinary when the exercise is saved (`uploadPending()`), so a cancelled edit leaves no
 * orphan upload. Create one per store and `dispose()` it with the store.
 */
export class PendingGuides {
  readonly items = signal<GuideDraft[]>([]);
  /** While uploading: which file of how many, and its progress. */
  readonly uploading = signal<{ index: number; total: number; percent: number } | null>(null);
  /** Why the API rejected the last save (`INVALID_GUIDE_ASSET`), as a dictionary key. */
  readonly rejection = signal<string | null>(null);

  private readonly stored = signal<AdminExerciseGuideDto[]>([]);
  readonly dirty = computed(() => !sameGuides(this.stored(), this.items()));
  readonly full = computed(() => this.items().length >= GUIDE_LIMITS.files);
  readonly invalidCaptions = computed(() => captionIssues(this.items()));

  constructor(
    private readonly upload: ImageUpload,
    private readonly notifier: Notifier,
  ) {}

  /** What the API has now (after loading or saving the exercise). */
  load(guides: readonly AdminExerciseGuideDto[]): void {
    this.revokeAll();
    this.stored.set([...guides]);
    this.items.set(guides.map(fromStoredGuide));
    this.rejection.set(null);
  }

  /** Only local previews: nothing reaches Cloudinary yet. Extra files beyond the cap are dropped. */
  add(files: readonly File[]): void {
    const room = GUIDE_LIMITS.files - this.items().length;
    if (files.length > room) this.notifier.info(`${MESSAGES}.tooMany`, { max: GUIDE_LIMITS.files });
    const drafts = files.slice(0, Math.max(room, 0)).map((file): GuideDraft => ({
      key: `local-${crypto.randomUUID()}`,
      publicId: null,
      file,
      previewUrl: URL.createObjectURL(file),
      kind: null,
      caption: {},
    }));
    this.items.update((list) => [...list, ...drafts]);
  }

  remove(key: string): void {
    const draft = this.items().find((d) => d.key === key);
    if (draft?.file) URL.revokeObjectURL(draft.previewUrl);
    this.items.update((list) => list.filter((d) => d.key !== key));
  }

  move(key: string, delta: -1 | 1): void {
    this.items.update((list) => moveDraft(list, key, delta));
  }

  setCaption(key: string, caption: Translatable): void {
    this.patch(key, { caption });
  }

  /**
   * Uploads the picked files not uploaded yet, one by one. False when one failed (already
   * reported): don't save. Uploaded ones keep their `publicId`, so a retry won't upload again.
   */
  async uploadPending(): Promise<boolean> {
    const pending = this.items().filter((d) => d.file && !d.publicId);
    try {
      for (const [i, draft] of pending.entries()) {
        this.uploading.set({ index: i + 1, total: pending.length, percent: 0 });
        const done = await firstValueFrom(
          this.upload.upload(draft.file!, 'exercise_guide').pipe(
            tap((event) => {
              if (event.type === 'progress') {
                this.uploading.update((u) => u && { ...u, percent: event.percent });
              }
            }),
            last(),
          ),
        );
        if (done.type !== 'done') return false;
        this.patch(draft.key, { publicId: done.image.publicId });
      }
      return true;
    } catch (error) {
      reportUploadError(error, this.notifier, MESSAGES);
      return false;
    } finally {
      this.uploading.set(null);
    }
  }

  /**
   * The API rejected the list. On `INVALID_GUIDE_ASSET` it destroyed the bad upload (it doesn't
   * say which), so every new file is uploaded again on the next save.
   */
  rejected(error: unknown): void {
    this.rejection.set(invalidGuideReasonKey(error));
    if (apiErrorCode(error) === 'INVALID_GUIDE_ASSET') {
      this.items.update((list) => list.map((d) => (d.file ? { ...d, publicId: null } : d)));
    }
  }

  dispose(): void {
    this.revokeAll();
  }

  private patch(key: string, changes: Partial<GuideDraft>): void {
    this.items.update((list) => list.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  }

  private revokeAll(): void {
    for (const draft of this.items()) if (draft.file) URL.revokeObjectURL(draft.previewUrl);
  }
}
