import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/** Every API error has this shape (backend `AllExceptionsFilter`). */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export function apiErrorBody(error: unknown): ApiErrorBody | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null) return null;
  return typeof (body as Partial<ApiErrorBody>).code === 'string' ? (body as ApiErrorBody) : null;
}

export function apiErrorCode(error: unknown): string | null {
  return apiErrorBody(error)?.code ?? null;
}

/**
 * Message for an API error in the active language:
 * `errors.<code>` from our dictionary (interpolated with `details`), else the API's own
 * message (already localized via Accept-Language), else a generic one.
 */
@Injectable({ providedIn: 'root' })
export class ApiErrorMessages {
  private readonly transloco = inject(TranslocoService);

  resolve(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.transloco.translate('errors.NETWORK_ERROR');
    }
    const body = apiErrorBody(error);
    if (body) {
      const local = this.fromDictionary(body);
      if (local) return local;
      if (body.message) return body.message;
    }
    return this.transloco.translate('errors.UNKNOWN_ERROR');
  }

  private fromDictionary({ code, details }: ApiErrorBody): string | null {
    const key = `errors.${code}`;
    const template: unknown = this.transloco.getTranslation(this.transloco.getActiveLang())[key];
    if (typeof template !== 'string') return null;
    const params =
      typeof details === 'object' && details !== null ? (details as Record<string, unknown>) : {};
    // Transloco renders missing params as "": the API's own message beats "límite ()".
    const placeholders = [...template.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
    if (placeholders.some((name) => params[name] === undefined)) return null;
    return this.transloco.translate(key, params);
  }
}
