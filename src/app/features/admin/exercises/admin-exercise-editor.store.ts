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
import { toReplaceGuidesDto } from './guide-drafts';
import { PendingGuides } from './pending-guides';

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
      /** Execution guides (images / GIFs); edited only once the exercise exists. */
      guides: new PendingGuides(inject(ImageUpload), notifier),
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
        store.guides.load(exercise.guides);
        patchState(store, { editing: exercise }, setFulfilled());
        return exercise;
      } catch (error) {
        patchState(store, setError(error));
        return null;
      }
    },

    /**
     * Files first (a failed upload saves nothing), then the exercise, then its guides (only
     * when they changed). If the API rejects the guides the exercise stays saved and the
     * editor keeps the pending list to fix and retry.
     */
    async save(model: AdminExerciseFormModel): Promise<AdminExerciseDto | null> {
      const editing = store.editing();
      const withGuides = editing !== null && store.guides.dirty();
      if (withGuides && store.guides.invalidCaptions().length) {
        store._notifier.info('admin.exercises.guides.captionInvalid');
        return null;
      }
      const imageUrl = await store.image.uploadIfPending();
      if (imageUrl === undefined) return null;
      if (withGuides && !(await store.guides.uploadPending())) return null;
      try {
        let saved = editing
          ? await store._api.adminExercisesControllerUpdate({
              id: editing.id,
              body: toUpdateGlobalExerciseDto(model, imageUrl),
            })
          : await store._api.adminExercisesControllerCreate({
              body: toCreateGlobalExerciseDto(model, imageUrl),
            });
        patchState(store, { editing: saved });
        if (withGuides) {
          try {
            saved = await store._api.adminExercisesControllerReplaceGuides({
              id: saved.id,
              body: toReplaceGuidesDto(store.guides.items()),
            });
          } catch (error) {
            // errorInterceptor already said why; the section shows the precise reason.
            store.guides.rejected(error);
            return saved;
          }
          patchState(store, { editing: saved });
          store.guides.load(saved.guides);
        }
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
      store.guides.dispose();
    },
  }),
);

export type AdminExerciseEditorStore = InstanceType<typeof AdminExerciseEditorStore>;
