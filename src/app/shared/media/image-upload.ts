import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, from, map, switchMap } from 'rxjs';
import { UploadSignatureRequestDto } from '../../api/models/upload-signature-request-dto';
import { UploadSignatureDto } from '../../api/models/upload-signature-dto';
import { MediaService } from '../../api/services/media.service';

export type UploadPurpose = UploadSignatureRequestDto['purpose'];

export interface UploadedImage {
  secureUrl: string;
  publicId: string;
  format: string;
}

export type UploadEvent =
  { type: 'progress'; percent: number } | { type: 'done'; image: UploadedImage };

/** Thrown before uploading when the file breaks the signed constraints. */
export class ImageRejectedError extends Error {
  constructor(readonly reason: 'tooLarge' | 'format') {
    super(`Image rejected: ${reason}`);
    this.name = 'ImageRejectedError';
  }
}

const normalizeFormat = (format: string) => {
  const f = format.trim().toLowerCase();
  return f === 'jpeg' ? 'jpg' : f;
};

/** `allowed_formats` is a comma list ("jpg,png,webp"); `jpeg` and `jpg` are the same. */
export function checkImage(file: File, maxBytes: number, allowedFormats: string): void {
  if (file.size > maxBytes) throw new ImageRejectedError('tooLarge');
  const allowed = allowedFormats.split(',').map(normalizeFormat);
  const format = file.type.startsWith('image/')
    ? file.type.slice('image/'.length)
    : (file.name.split('.').pop() ?? '');
  if (!allowed.includes(normalizeFormat(format))) throw new ImageRejectedError('format');
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
}

export type { CloudinaryUploadResponse };

/**
 * Multipart POST of `file` to the signed Cloudinary target (shared by image and audio uploads).
 * Every signed param is sent unchanged, or Cloudinary rejects the signature; params the API
 * did not sign (e.g. `transformation` for sounds) are simply absent.
 */
export function postSigned(http: HttpClient, signed: UploadSignatureDto, file: File) {
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', signed.apiKey);
  body.append('signature', signed.signature);
  for (const [key, value] of Object.entries(signed.params)) {
    if (value !== undefined && value !== null) body.append(key, String(value));
  }
  return http.post<CloudinaryUploadResponse>(signed.uploadUrl, body, {
    reportProgress: true,
    observe: 'events',
  });
}

/**
 * Signed direct upload to Cloudinary: the API signs (it holds the secret), the browser
 * sends the file straight to Cloudinary. Nothing secret ever reaches the client.
 * The Cloudinary URL is not an API URL, so our interceptors (bearer, errors) skip it.
 */
@Injectable({ providedIn: 'root' })
export class ImageUpload {
  private readonly media = inject(MediaService);
  private readonly http = inject(HttpClient);

  upload(file: File, purpose: UploadPurpose): Observable<UploadEvent> {
    return from(this.media.mediaControllerCreateSignature({ body: { purpose } })).pipe(
      switchMap((signed) => {
        checkImage(file, signed.maxFileSizeBytes, signed.params.allowed_formats);
        return postSigned(this.http, signed, file);
      }),
      map((event): UploadEvent | null => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { type: 'progress', percent };
        }
        if (event.type === HttpEventType.Response && event.body) {
          const { secure_url, public_id, format } = event.body;
          return { type: 'done', image: { secureUrl: secure_url, publicId: public_id, format } };
        }
        return null;
      }),
      filter((event): event is UploadEvent => event !== null),
    );
  }
}
