import { HttpErrorResponse } from '@angular/common/http';
import { AdminRestSoundDto } from '../../../api/models/admin-rest-sound-dto';
import {
  SOUND_LIMITS,
  formatKilobytes,
  formatSeconds,
  invalidSoundReasonKey,
  toCreateSoundDto,
  toSoundForm,
  toUpdateSoundDto,
} from './sound-forms';

const sound = (): AdminRestSoundDto => ({
  id: 's1',
  slug: 'gong',
  name: { es: 'Gong', en: 'Gong' },
  access: 'premium',
  publicId: 'gymapp/dev/sounds/abc',
  format: 'mp3',
  durationSec: 4.2,
  bytes: 90_000,
  sortOrder: 3,
  mp3Url: 'https://res.cloudinary.com/demo/video/upload/gymapp/dev/sounds/abc.mp3',
  wavUrl: null,
  createdAt: '',
  updatedAt: '',
});

describe('sound form', () => {
  it('a new sound is free, unordered and empty', () => {
    const model = toSoundForm(null);
    expect(model).toMatchObject({ slug: '', access: 'free', sortOrder: 0 });
    expect(model.name['es']).toBe('');
  });

  it('loads an existing sound', () => {
    expect(toSoundForm(sound())).toMatchObject({
      slug: 'gong',
      access: 'premium',
      sortOrder: 3,
      name: { es: 'Gong', en: 'Gong' },
    });
  });

  it('create sends the slug and the uploaded public id; blank languages are dropped', () => {
    const model = toSoundForm(null);
    model.slug = 'bell';
    model.name = { es: ' Campana ', en: '' };
    expect(toCreateSoundDto(model, 'gymapp/dev/sounds/xyz')).toEqual({
      slug: 'bell',
      name: { es: 'Campana' },
      access: 'free',
      publicId: 'gymapp/dev/sounds/xyz',
      sortOrder: 0,
    });
  });

  it('update never sends the slug, and sends publicId only when the audio was replaced', () => {
    const model = toSoundForm(sound());
    const same = toUpdateSoundDto(model);
    expect(same).not.toHaveProperty('slug');
    expect(same).not.toHaveProperty('publicId');
    expect(toUpdateSoundDto(model, 'gymapp/dev/sounds/new').publicId).toBe('gymapp/dev/sounds/new');
  });

  it('knows the limits the API enforces', () => {
    expect(SOUND_LIMITS).toMatchObject({ slug: 60, name: 80 });
  });
});

const httpError = (error: unknown) => new HttpErrorResponse({ status: 400, error });

describe('invalidSoundReasonKey', () => {
  it('maps the API rejection reason to a dictionary key', () => {
    const error = httpError({ code: 'INVALID_SOUND_ASSET', details: { reason: 'size' } });
    expect(invalidSoundReasonKey(error)).toBe('admin.sounds.reasons.size');
  });

  it('is null for unknown reasons and other errors', () => {
    const unknown = httpError({ code: 'INVALID_SOUND_ASSET', details: { reason: 'x' } });
    expect(invalidSoundReasonKey(unknown)).toBeNull();
    expect(invalidSoundReasonKey(new Error('x'))).toBeNull();
  });
});

describe('formatKilobytes', () => {
  it('rounds to whole kB', () => {
    expect(formatKilobytes(1536)).toBe('2 kB');
    expect(formatKilobytes(1024 * 1024)).toBe('1024 kB');
  });
});

describe('formatSeconds', () => {
  it('shows one decimal below a minute', () => {
    expect(formatSeconds(4.24)).toBe('4.2 s');
    expect(formatSeconds(29)).toBe('29.0 s');
  });
});
