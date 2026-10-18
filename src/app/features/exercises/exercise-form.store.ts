import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { firstValueFrom, last, tap } from 'rxjs';
import { ExerciseDetailDto } from '../../api/models/exercise-detail-dto';
import { ExerciseTagDto } from '../../api/models/exercise-tag-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { API_PREFIX } from '../../core/http/api-request';
import { Notifier } from '../../core/notify/notifier';
import { ImageRejectedError, ImageUpload } from '../../shared/media/image-upload';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';
import { ExerciseFormModel, toCreateDto, toUpdateDto } from './exercise-form';

interface ExerciseFormState {
  /** null = creating. */
  editing: ExerciseDetailDto | null;
  tags: ExerciseTagDto[];
  /** The image already stored (Cloudinary URL), or null. */
  imageUrl: string | null;
  /** Picked but not uploaded yet: it only goes to Cloudinary when the exercise is saved. */
  pendingFile: File | null;
  /** Local `blob:` preview of `pendingFile`. */
  previewUrl: string | null;
  /** 0–100 while uploading, null otherwise. */
  uploadProgress: number | null;
}

export const ExerciseFormStore = signalStore(
  withState<ExerciseFormState>({
    editing: null,
    tags: [],
    imageUrl: null,
    pendingFile: null,
    previewUrl: null,
    uploadProgress: null,
  }),
  withRequestStatus(),
  withProps(() => ({
    _api: inject(ExercisesService),
    _upload: inject(ImageUpload),
    _notifier: inject(Notifier),
  })),
  withComputed(({ previewUrl, imageUrl }) => ({
    /** What the form shows: the picked file, else the stored image. */
    shownImage: computed(() => previewUrl() ?? imageUrl()),
  })),
  withMethods((store) => {
    const clearPending = () => {
      const preview = store.previewUrl();
      if (preview) URL.revokeObjectURL(preview);
      patchState(store, { pendingFile: null, previewUrl: null });
    };

    /** Uploads the picked file; resolves to its URL, or null when it failed (already reported). */
    const uploadPending = async (file: File): Promise<string | null> => {
      patchState(store, { uploadProgress: 0 });
      try {
        const done = await firstValueFrom(
          store._upload.upload(file, 'custom_exercise_image').pipe(
            tap((event) => {
              if (event.type === 'progress') patchState(store, { uploadProgress: event.percent });
            }),
            last(),
          ),
        );
        return done.type === 'done' ? done.image.secureUrl : null;
      } catch (error) {
        // Errors from our API (e.g. MEDIA_NOT_CONFIGURED on the signature) were already
        // reported by errorInterceptor; Cloudinary's are not an API request, so say it here.
        const reportedByApi =
          error instanceof HttpErrorResponse && (error.url ?? '').includes(API_PREFIX);
        if (error instanceof ImageRejectedError) {
          store._notifier.info(`exercises.form.image.${error.reason}`);
        } else if (!reportedByApi) {
          store._notifier.info('exercises.form.image.failed');
        }
        return null;
      } finally {
        patchState(store, { uploadProgress: null });
      }
    };

    return {
      clearPending,

      async loadTags(): Promise<void> {
        try {
          patchState(store, { tags: await store._api.exerciseTagsControllerList() });
        } catch {
          // The tag selector stays empty.
        }
      },

      /** Edit mode: only the caller's custom exercises are editable. */
      async loadForEdit(id: string): Promise<ExerciseDetailDto | null> {
        patchState(store, setPending());
        try {
          const exercise = await store._api.exercisesControllerDetail({ id });
          if (!exercise.isCustom) throw new Error('Not a custom exercise');
          patchState(store, { editing: exercise, imageUrl: exercise.imageUrl }, setFulfilled());
          return exercise;
        } catch (error) {
          patchState(store, setError(error));
          return null;
        }
      },

      /** Only a local preview: nothing reaches Cloudinary until the exercise is saved. */
      selectImage(file: File): void {
        clearPending();
        patchState(store, { pendingFile: file, previewUrl: URL.createObjectURL(file) });
      },

      removeImage(): void {
        clearPending();
        patchState(store, { imageUrl: null });
      },

      /**
       * Uploads the picked image (if any), then saves. A failed upload saves nothing, so the
       * user keeps the form and the picked file to retry. Resolves to the saved exercise, or
       * null (errors already shown).
       */
      async save(model: ExerciseFormModel): Promise<ExerciseDetailDto | null> {
        const file = store.pendingFile();
        let imageUrl = store.imageUrl();
        if (file) {
          const uploaded = await uploadPending(file);
          if (!uploaded) return null;
          imageUrl = uploaded;
        }
        const editing = store.editing();
        try {
          const saved = editing
            ? await store._api.exercisesControllerUpdate({
                id: editing.id,
                body: toUpdateDto(model, imageUrl),
              })
            : await store._api.exercisesControllerCreate({
                body: toCreateDto(model, imageUrl),
              });
          // Uploaded and linked: a retry must not upload it again.
          clearPending();
          patchState(store, { imageUrl });
          store._notifier.info('common.saved');
          return saved;
        } catch {
          if (file) {
            // Keep the uploaded URL so a retry doesn't upload the same file twice.
            clearPending();
            patchState(store, { imageUrl });
          }
          return null;
        }
      },
    };
  }),
  withHooks({
    onDestroy(store) {
      store.clearPending();
    },
  }),
);

export type ExerciseFormStore = InstanceType<typeof ExerciseFormStore>;
