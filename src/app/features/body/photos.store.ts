import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { firstValueFrom, last, tap } from 'rxjs';
import { CompareDto } from '../../api/models/compare-dto';
import { CreateProgressPhotoDto } from '../../api/models/create-progress-photo-dto';
import { ProgressPhotoDto } from '../../api/models/progress-photo-dto';
import { ProgressPhotosService } from '../../api/services/progress-photos.service';
import { API_PREFIX } from '../../core/http/api-request';
import { Notifier } from '../../core/notify/notifier';
import { todayIso } from '../../shared/format/local-dates';
import { ImageRejectedError, ImageUpload, UploadEvent } from '../../shared/media/image-upload';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';

export type PhotoView = ProgressPhotoDto['view'];
export const PHOTO_VIEWS: readonly PhotoView[] = ['front', 'side', 'back'];
export const PHOTOS_PAGE_SIZE = 24;

type PhotoFormat = CreateProgressPhotoDto['format'];
const PHOTO_FORMATS: readonly PhotoFormat[] = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const isPhotoFormat = (value: string): value is PhotoFormat =>
  (PHOTO_FORMATS as readonly string[]).includes(value);

export interface NewPhoto {
  file: File;
  view: PhotoView;
  /** Local `YYYY-MM-DD`. */
  date: string;
  notes: string;
}

export interface PhotoDay {
  date: string;
  photos: ProgressPhotoDto[];
}

/** Newest day first; inside a day, front → side → back. */
export function groupByDay(photos: ProgressPhotoDto[]): PhotoDay[] {
  const days = new Map<string, ProgressPhotoDto[]>();
  for (const photo of photos) {
    const day = todayIso(new Date(photo.takenAt));
    days.set(day, [...(days.get(day) ?? []), photo]);
  }
  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      photos: list.sort((a, b) => PHOTO_VIEWS.indexOf(a.view) - PHOTO_VIEWS.indexOf(b.view)),
    }));
}

/** Local day → an instant on it: now for today, local noon otherwise. */
export function takenAtFor(date: string, now = new Date()): string {
  if (date === todayIso(now)) return now.toISOString();
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
}

interface PhotosState {
  items: ProgressPhotoDto[];
  total: number;
  page: number;
  /** 0–100 while a file goes to Cloudinary; null when idle. */
  uploadPercent: number | null;
  compareView: PhotoView;
  compare: CompareDto | null;
}

/**
 * Progress photos. Uploading needs Premium (the API checks it); listing, comparing and
 * deleting don't, so a downgraded user keeps their photos.
 */
export const PhotosStore = signalStore(
  withState<PhotosState>({
    items: [],
    total: 0,
    page: 0,
    uploadPercent: null,
    compareView: 'front',
    compare: null,
  }),
  withRequestStatus(),
  withProps(() => ({
    _api: inject(ProgressPhotosService),
    _upload: inject(ImageUpload),
    _notifier: inject(Notifier),
  })),
  withMethods((store) => {
    const loadCompare = async (): Promise<void> => {
      try {
        const compare = await store._api.progressPhotosControllerCompare({
          view: store.compareView(),
        });
        patchState(store, { compare });
      } catch {
        patchState(store, { compare: null });
      }
    };

    const reload = async (): Promise<void> => {
      patchState(store, setPending());
      try {
        const result = await store._api.progressPhotosControllerList({
          page: 1,
          limit: Math.max(PHOTOS_PAGE_SIZE, store.items().length),
        });
        patchState(
          store,
          { items: result.items, total: result.meta.total, page: 1 },
          setFulfilled(),
        );
      } catch (error) {
        patchState(store, setError(error));
      }
    };

    return {
      reload,
      loadCompare,

      async loadMore(): Promise<void> {
        const page = Math.floor(store.items().length / PHOTOS_PAGE_SIZE) + 1;
        try {
          const result = await store._api.progressPhotosControllerList({
            page,
            limit: PHOTOS_PAGE_SIZE,
          });
          const known = new Set(store.items().map((p) => p.id));
          patchState(store, {
            items: [...store.items(), ...result.items.filter((p) => !known.has(p.id))],
            total: result.meta.total,
            page,
          });
        } catch {
          // errorInterceptor already reported it.
        }
      },

      setCompareView(compareView: PhotoView): Promise<void> {
        patchState(store, { compareView });
        return loadCompare();
      },

      /** Cloudinary (signed, with progress) → register it in the API. */
      async add(photo: NewPhoto): Promise<boolean> {
        patchState(store, { uploadPercent: 0 });
        try {
          const done = await firstValueFrom(
            store._upload.upload(photo.file, 'progress_photo').pipe(
              tap((event: UploadEvent) => {
                if (event.type === 'progress') patchState(store, { uploadPercent: event.percent });
              }),
              last(),
            ),
          );
          if (done.type !== 'done') return false;
          // The signature already limits formats; this only narrows the type.
          const format = done.image.format.toLowerCase();
          if (!isPhotoFormat(format)) throw new ImageRejectedError('format');
          const notes = photo.notes.trim();
          await store._api.progressPhotosControllerCreate({
            body: {
              publicId: done.image.publicId,
              format,
              url: done.image.secureUrl,
              view: photo.view,
              takenAt: takenAtFor(photo.date),
              ...(notes && { notes }),
            },
          });
          store._notifier.info('body.photos.added');
          await Promise.all([reload(), loadCompare()]);
          return true;
        } catch (error) {
          // API errors were already reported by errorInterceptor; Cloudinary ones were not.
          const reportedByApi =
            error instanceof HttpErrorResponse && (error.url ?? '').includes(API_PREFIX);
          if (error instanceof ImageRejectedError) {
            store._notifier.info(`body.photos.rejected.${error.reason}`);
          } else if (!reportedByApi) {
            store._notifier.info('body.photos.uploadFailed');
          }
          return false;
        } finally {
          patchState(store, { uploadPercent: null });
        }
      },

      async remove(id: string): Promise<void> {
        try {
          await store._api.progressPhotosControllerRemove({ id });
          store._notifier.info('body.photos.deleted');
          patchState(store, (s) => ({
            items: s.items.filter((p) => p.id !== id),
            total: Math.max(0, s.total - 1),
          }));
          await loadCompare();
        } catch {
          // errorInterceptor already reported it.
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      void store.reload();
      void store.loadCompare();
    },
  }),
);

export type PhotosStore = InstanceType<typeof PhotosStore>;
