import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { Subscription } from 'rxjs';
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
  imageUrl: string | null;
  /** 0–100 while uploading, null otherwise. */
  uploadProgress: number | null;
}

export const ExerciseFormStore = signalStore(
  withState<ExerciseFormState>({ editing: null, tags: [], imageUrl: null, uploadProgress: null }),
  withRequestStatus(),
  withProps(() => ({
    _api: inject(ExercisesService),
    _upload: inject(ImageUpload),
    _notifier: inject(Notifier),
  })),
  withMethods((store) => {
    let upload: Subscription | null = null;

    return {
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

      uploadImage(file: File): void {
        upload?.unsubscribe();
        patchState(store, { uploadProgress: 0 });
        upload = store._upload.upload(file, 'custom_exercise_image').subscribe({
          next: (event) => {
            if (event.type === 'progress') patchState(store, { uploadProgress: event.percent });
            else patchState(store, { imageUrl: event.image.secureUrl, uploadProgress: null });
          },
          error: (error: unknown) => {
            patchState(store, { uploadProgress: null });
            // Errors from our API (e.g. MEDIA_NOT_CONFIGURED on the signature) were already
            // reported by errorInterceptor; Cloudinary's are not an API request, so say it here.
            const reportedByApi =
              error instanceof HttpErrorResponse && (error.url ?? '').includes(API_PREFIX);
            if (error instanceof ImageRejectedError) {
              store._notifier.info(`exercises.form.image.${error.reason}`);
            } else if (!reportedByApi) {
              store._notifier.info('exercises.form.image.failed');
            }
          },
        });
      },

      removeImage(): void {
        upload?.unsubscribe();
        patchState(store, { imageUrl: null, uploadProgress: null });
      },

      /** Resolves to the saved exercise, or null (errors already shown). */
      async save(model: ExerciseFormModel): Promise<ExerciseDetailDto | null> {
        const editing = store.editing();
        try {
          const saved = editing
            ? await store._api.exercisesControllerUpdate({
                id: editing.id,
                body: toUpdateDto(model, store.imageUrl()),
              })
            : await store._api.exercisesControllerCreate({
                body: toCreateDto(model, store.imageUrl()),
              });
          store._notifier.info('common.saved');
          return saved;
        } catch {
          return null;
        }
      },
    };
  }),
);

export type ExerciseFormStore = InstanceType<typeof ExerciseFormStore>;
