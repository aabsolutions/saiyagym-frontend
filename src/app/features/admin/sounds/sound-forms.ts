import { schema } from '@angular/forms/signals';
import { AdminRestSoundDto } from '../../../api/models/admin-rest-sound-dto';
import { CreateRestSoundDto } from '../../../api/models/create-rest-sound-dto';
import { UpdateRestSoundDto } from '../../../api/models/update-rest-sound-dto';
import { apiErrorBody } from '../../../core/http/api-error';
import { slugRule } from '../../../shared/forms/slug';
import {
  Translatable,
  fromTranslatable,
  toTranslatable,
  translatable,
} from '../../../shared/i18n/translatable';

/** Mirrors the API DTO (rest-sound.dto); the API validates again. */
export const SOUND_LIMITS = { slug: 60, name: 80 } as const;

export type SoundAccess = AdminRestSoundDto['access'];
export const SOUND_ACCESS: readonly SoundAccess[] = ['free', 'premium'];

export interface SoundFormModel {
  slug: string;
  name: Translatable;
  access: SoundAccess;
  sortOrder: number;
}

export function toSoundForm(sound: AdminRestSoundDto | null): SoundFormModel {
  return {
    slug: sound?.slug ?? '',
    name: fromTranslatable(sound?.name),
    access: sound?.access ?? 'free',
    sortOrder: sound?.sortOrder ?? 0,
  };
}

export const soundSchema = (isNew: () => boolean) =>
  schema<SoundFormModel>((path) => {
    slugRule(path.slug, SOUND_LIMITS.slug, isNew);
    translatable(path.name, { required: true, maxLength: SOUND_LIMITS.name });
  });

export const toCreateSoundDto = (m: SoundFormModel, publicId: string): CreateRestSoundDto => ({
  slug: m.slug,
  name: toTranslatable(m.name),
  access: m.access,
  publicId,
  sortOrder: m.sortOrder,
});

/** The slug is immutable; `publicId` only travels when the audio was replaced. */
export const toUpdateSoundDto = (m: SoundFormModel, publicId?: string): UpdateRestSoundDto => ({
  name: toTranslatable(m.name),
  access: m.access,
  sortOrder: m.sortOrder,
  ...(publicId && { publicId }),
});

const REJECTION_REASONS = ['folder', 'not_found', 'format', 'size', 'duration'] as const;

/**
 * `INVALID_SOUND_ASSET` carries `details.reason`: the dictionary key that explains it
 * (`admin.sounds.reasons.<reason>`), or null for any other error.
 */
export function invalidSoundReasonKey(error: unknown): string | null {
  const body = apiErrorBody(error);
  if (body?.code !== 'INVALID_SOUND_ASSET') return null;
  const reason = (body.details as { reason?: unknown } | undefined)?.reason;
  return (REJECTION_REASONS as readonly unknown[]).includes(reason)
    ? `admin.sounds.reasons.${String(reason)}`
    : null;
}

export const formatSeconds = (seconds: number): string => `${seconds.toFixed(1)} s`;

export const formatKilobytes = (bytes: number): string => `${Math.round(bytes / 1024)} kB`;
