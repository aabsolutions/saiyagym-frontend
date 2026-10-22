import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, filter, from, map, switchMap } from 'rxjs';
import { MediaService } from '../../api/services/media.service';
import { postSigned } from './image-upload';

/** Notification sounds of 30 s or more are ignored by iOS, so the cap is strictly below. */
export const MAX_SOUND_SECONDS = 30;

export interface UploadedAudio {
  publicId: string;
  format: string;
}

export type AudioUploadEvent =
  { type: 'progress'; percent: number } | { type: 'done'; audio: UploadedAudio };

/** Thrown before uploading when the file breaks the limits. The API checks again. */
export class AudioRejectedError extends Error {
  constructor(readonly reason: 'tooLarge' | 'format' | 'tooLong' | 'unreadable') {
    super(`Audio rejected: ${reason}`);
    this.name = 'AudioRejectedError';
  }
}

/** Duration problems alone (known before asking for a signature). */
export function checkAudioDuration(durationSec: number): void {
  if (!Number.isFinite(durationSec)) throw new AudioRejectedError('unreadable');
  if (durationSec >= MAX_SOUND_SECONDS) throw new AudioRejectedError('tooLong');
}

/** `allowed_formats` is a comma list ("mp3,wav,m4a,ogg,aac"). */
export function checkAudio(
  file: File,
  maxBytes: number,
  allowedFormats: string,
  durationSec: number,
): void {
  if (file.size > maxBytes) throw new AudioRejectedError('tooLarge');
  const allowed = allowedFormats.split(',').map((f) => f.trim().toLowerCase());
  const extension = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!allowed.includes(extension)) throw new AudioRejectedError('format');
  checkAudioDuration(durationSec);
}

export interface AudioDurationDeps {
  createAudio: () => HTMLAudioElement;
  createObjectUrl: (file: File) => string;
  revokeObjectUrl: (url: string) => void;
}

const browserDeps: AudioDurationDeps = {
  createAudio: () => new Audio(),
  createObjectUrl: (file) => URL.createObjectURL(file),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
};

/** Duration in seconds from the file's metadata, or NaN when the browser cannot decode it. */
export function readAudioDuration(
  file: File,
  deps: AudioDurationDeps = browserDeps,
): Promise<number> {
  return new Promise((resolve) => {
    const audio = deps.createAudio();
    const url = deps.createObjectUrl(file);
    const done = (seconds: number) => {
      deps.revokeObjectUrl(url);
      resolve(seconds);
    };
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => done(audio.duration));
    audio.addEventListener('error', () => done(Number.NaN));
    audio.src = url;
    audio.load();
  });
}

/** Replaceable in tests (jsdom cannot decode audio). */
export const AUDIO_DURATION_READER = new InjectionToken<(file: File) => Promise<number>>(
  'AUDIO_DURATION_READER',
  { providedIn: 'root', factory: () => (file) => readAudioDuration(file) },
);

/**
 * Admin-only signed upload of a rest-alarm sound (purpose `rest_sound`, Cloudinary `video`
 * resource). Duration is checked first, then size and format against the signature; the API
 * verifies the stored asset again when the sound is created.
 */
@Injectable({ providedIn: 'root' })
export class AudioUpload {
  private readonly media = inject(MediaService);
  private readonly http = inject(HttpClient);
  private readonly readDuration = inject(AUDIO_DURATION_READER);

  upload(file: File): Observable<AudioUploadEvent> {
    return from(this.readDuration(file)).pipe(
      switchMap((durationSec) => {
        checkAudioDuration(durationSec);
        const signature = this.media.mediaControllerCreateSignature({
          body: { purpose: 'rest_sound' },
        });
        return from(signature).pipe(
          switchMap((signed) => {
            checkAudio(file, signed.maxFileSizeBytes, signed.params.allowed_formats, durationSec);
            return postSigned(this.http, signed, file);
          }),
        );
      }),
      map((event): AudioUploadEvent | null => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { type: 'progress', percent };
        }
        if (event.type === HttpEventType.Response && event.body) {
          return {
            type: 'done',
            audio: { publicId: event.body.public_id, format: event.body.format },
          };
        }
        return null;
      }),
      filter((event): event is AudioUploadEvent => event !== null),
    );
  }
}
