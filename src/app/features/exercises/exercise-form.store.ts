import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { ExerciseDetailDto } from '../../api/models/exercise-detail-dto';
import { ExerciseTagDto } from '../../api/models/exercise-tag-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { Notifier } from '../../core/notify/notifier';
import { ImageUpload } from '../../shared/media/image-upload';
import { PendingImage } from '../../shared/media/pending-image';
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
}

export const ExerciseFormStore = signalStore(
  withState<ExerciseFormState>({ editing: null, tags: [] }),
  withRequestStatus(),
  withProps(() => {
    const notifier = inject(Notifier);
    return {
      _api: inject(ExercisesService),
      _notifier: notifier,
      /** Uploaded on save, never on pick. */
      _image: new PendingImage(
        inject(ImageUpload),
        notifier,
        'custom_exercise_image',
        'exercises.form.image',
      ),
    };
  }),
  withProps(({ _image }) => ({
    shownImage: _image.shown,
    pendingFile: _image.pendingFile.asReadonly(),
    uploadProgress: _image.uploadProgress.asReadonly(),
  })),
  withMethods((store) => ({
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
        store._image.storedUrl.set(exercise.imageUrl);
        patchState(store, { editing: exercise }, setFulfilled());
        return exercise;
      } catch (error) {
        patchState(store, setError(error));
        return null;
      }
    },

    selectImage: (file: File) => store._image.pick(file),
    removeImage: () => store._image.remove(),

    /**
     * Uploads the picked image (if any), then saves. A failed upload saves nothing, so the
     * user keeps the form and the picked file to retry. Resolves to the saved exercise, or
     * null (errors already shown).
     */
    async save(model: ExerciseFormModel): Promise<ExerciseDetailDto | null> {
      const imageUrl = await store._image.uploadIfPending();
      if (imageUrl === undefined) return null;
      const editing = store.editing();
      try {
        const saved = editing
          ? await store._api.exercisesControllerUpdate({
              id: editing.id,
              body: toUpdateDto(model, imageUrl),
            })
          : await store._api.exercisesControllerCreate({ body: toCreateDto(model, imageUrl) });
        store._notifier.info('common.saved');
        return saved;
      } catch {
        return null;
      }
    },
  })),
  withHooks({
    onDestroy(store) {
      store._image.dispose();
    },
  }),
);

export type ExerciseFormStore = InstanceType<typeof ExerciseFormStore>;
