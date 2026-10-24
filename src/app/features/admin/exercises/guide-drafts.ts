import { AdminExerciseGuideDto } from '../../../api/models/admin-exercise-guide-dto';
import { ReplaceGuidesDto } from '../../../api/models/replace-guides-dto';
import { apiErrorBody } from '../../../core/http/api-error';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/languages';
import {
  Translatable,
  fromTranslatable,
  toOptionalTranslatable,
} from '../../../shared/i18n/translatable';

/** Mirrors the API (MAX_GUIDES, GuideItemDto caption). The API validates again. */
export const GUIDE_LIMITS = { files: 6, caption: 200 } as const;

/** What the API accepts for `exercise_guide` (the signature says it too). */
export const GUIDE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * One row of the guide editor. A stored guide has a `publicId`; a picked file has `file` (and a
 * `blob:` preview) until it is uploaded on save — then it gets a `publicId` too but keeps `file`
 * until the API accepts it, so a rejected upload can be sent again.
 */
export interface GuideDraft {
  /** Stable key for the list (the stored guide id, or a local one). */
  key: string;
  publicId: string | null;
  file: File | null;
  previewUrl: string;
  /** Known once stored (the API reads it from Cloudinary). */
  kind: AdminExerciseGuideDto['kind'] | null;
  caption: Translatable;
}

export function fromStoredGuide(guide: AdminExerciseGuideDto): GuideDraft {
  return {
    key: guide.id,
    publicId: guide.publicId,
    file: null,
    previewUrl: guide.url,
    kind: guide.kind,
    caption: fromTranslatable(guide.caption),
  };
}

/** Moves one row up (`-1`) or down (`+1`); out-of-range moves leave the list as is. */
export function moveDraft(list: readonly GuideDraft[], key: string, delta: -1 | 1): GuideDraft[] {
  const from = list.findIndex((d) => d.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

/**
 * Rows whose caption the API would reject: something written but not the default language
 * (IsTranslatable requires it), or too long.
 */
export function captionIssues(list: readonly GuideDraft[]): string[] {
  return list
    .filter((d) => {
      const texts = Object.values(d.caption).map((t) => t.trim());
      const written = texts.some(Boolean);
      const tooLong = texts.some((t) => t.length > GUIDE_LIMITS.caption);
      return tooLong || (written && !d.caption[DEFAULT_LANGUAGE]?.trim());
    })
    .map((d) => d.key);
}

/** Every row must be uploaded (have a `publicId`) first. */
export function toReplaceGuidesDto(list: readonly GuideDraft[]): ReplaceGuidesDto {
  return {
    guides: list.map((d) => {
      if (!d.publicId) throw new Error(`Guide ${d.key} is not uploaded`);
      const caption = toOptionalTranslatable(d.caption);
      return { publicId: d.publicId, ...(caption && { caption }) };
    }),
  };
}

/** Nothing to save: same files, order and captions as stored. */
export function sameGuides(
  stored: readonly AdminExerciseGuideDto[],
  list: readonly GuideDraft[],
): boolean {
  if (stored.length !== list.length || list.some((d) => d.file)) return false;
  return stored.every((guide, i) => {
    const draft = list[i]!;
    return (
      draft.publicId === guide.publicId &&
      sameText(toOptionalTranslatable(draft.caption) ?? {}, guide.caption)
    );
  });
}

const sameText = (a: Translatable, b: Translatable) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([lang, text]) => b[lang] === text);

const REJECTION_REASONS = ['folder', 'not_found', 'format', 'size'] as const;

/**
 * `INVALID_GUIDE_ASSET` carries `details.reason`: the dictionary key that explains it
 * (`admin.exercises.guides.reasons.<reason>`), or null for any other error.
 */
export function invalidGuideReasonKey(error: unknown): string | null {
  const body = apiErrorBody(error);
  if (body?.code !== 'INVALID_GUIDE_ASSET') return null;
  const reason = (body.details as { reason?: unknown } | undefined)?.reason;
  return (REJECTION_REASONS as readonly unknown[]).includes(reason)
    ? `admin.exercises.guides.reasons.${String(reason)}`
    : null;
}
