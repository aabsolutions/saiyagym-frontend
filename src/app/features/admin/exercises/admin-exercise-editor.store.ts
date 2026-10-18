import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { AdminExerciseDto } from '../../../api/models/admin-exercise-dto';
import { AdminExerciseTagDto } from '../../../api/models/admin-exercise-tag-dto';
import { AdminExercisesService } from '../../../api/services/admin-exercises.service';
import { Notifier } from '../../../core/notify/notifier';
import { ImageUpload } from '../../../shared/media/image-upload';
import { PendingImage } from '../../../shared/media/pending-image';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../../shared/store/with-request-status';
import {
  AdminExerciseFormModel,
  toCreateGlobalExerciseDto,
  toUpdateGlobalExerciseDto,
} from './admin-exercise-form';

interface EditorState {
  /** null = creating. */
  editing: AdminExerciseDto | null;
  tags: AdminExerciseTagDto[];
}

export const AdminExerciseEditorStore = signalStore(
  withState<EditorState>({ editing: null, tags: [] }),
  withRequestStatus(),
  withProps(() => {
    const notifier = inject(Notifier);
    return {
      _api: inject(AdminExercisesService),
      _notifier: notifier,
      /** Global catalog image (admin-only signature); uploaded on save, never on pick. */
      image: new PendingImage(
        inject(ImageUpload),
        notifier,
        'exercise_image',
        'exercises.form.image',
      ),
    };
  }),
  withMethods((store) => ({
    async loadTags(): Promise<void> {
      try {
        patchState(store, { tags: await store._api.adminExerciseTagsControllerList() });
      } catch {
        // The tag selector stays empty.
      }
    },

    async load(id: string): Promise<AdminExerciseDto | null> {
      patchState(store, setPending());
      try {
        const exercise = await store._api.adminExercisesControllerFindOne({ id });
        store.image.storedUrl.set(exercise.imageUrl);
        patchState(store, { editing: exercise }, setFulfilled());
        return exercise;
      } catch (error) {
        patchState(store, setError(error));
        return null;
      }
    },

    /** Image first (a failed upload saves nothing), then the exercise. */
    async save(model: AdminExerciseFormModel): Promise<AdminExerciseDto | null> {
      const imageUrl = await store.image.uploadIfPending();
      if (imageUrl === undefined) return null;
      const editing = store.editing();
      try {
        const saved = editing
          ? await store._api.adminExercisesControllerUpdate({
              id: editing.id,
              body: toUpdateGlobalExerciseDto(model, imageUrl),
            })
          : await store._api.adminExercisesControllerCreate({
              body: toCreateGlobalExerciseDto(model, imageUrl),
            });
        patchState(store, { editing: saved });
        store._notifier.info('common.saved');
        return saved;
      } catch {
        return null;
      }
    },
  })),
  withHooks({
    onInit(store) {
      void store.loadTags();
    },
    onDestroy(store) {
      store.image.dispose();
    },
  }),
);

export type AdminExerciseEditorStore = InstanceType<typeof AdminExerciseEditorStore>;
