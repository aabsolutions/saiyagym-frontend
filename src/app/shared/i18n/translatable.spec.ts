import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { slugError, slugify } from '../forms/slug';
import {
  Translatable,
  fromTranslatable,
  localizeText,
  missingLanguages,
  toOptionalTranslatable,
  toTranslatable,
  translatable,
} from './translatable';

describe('translatable content', () => {
  it('the editor gets one field per configured language, keeping extra ones', () => {
    expect(fromTranslatable(null)).toEqual({ es: '', en: '' });
    expect(fromTranslatable({ es: 'Sentadilla', pt: 'Agachamento' })).toEqual({
      es: 'Sentadilla',
      en: '',
      pt: 'Agachamento',
    });
  });

  it('the API gets trimmed texts without blanks (IsTranslatable rejects empty values)', () => {
    expect(toTranslatable({ es: ' Press ', en: '  ' })).toEqual({ es: 'Press' });
    expect(toOptionalTranslatable({ es: '', en: '' })).toBeUndefined();
  });

  it('localizes like the API: UI language, else the default one', () => {
    expect(localizeText({ es: 'Pecho', en: 'Chest' }, 'en')).toBe('Chest');
    expect(localizeText({ es: 'Pecho' }, 'en')).toBe('Pecho');
    expect(missingLanguages({ es: 'Pecho', en: '' })).toEqual(['en']);
  });

  it('requires the default language and checks every language length', () => {
    const errorsOf = (value: Translatable, required: boolean) =>
      TestBed.runInInjectionContext(() => {
        const f = form(signal({ name: value }), (p) =>
          translatable(p.name, { required, maxLength: 5 }),
        );
        return f
          .name()
          .errors()
          .map((e) => e.kind);
      });
    expect(errorsOf({ es: '', en: '' }, true)).toEqual(['translatableDefault']);
    // Optional and empty is fine; optional but written needs the default language.
    expect(errorsOf({ es: '', en: '' }, false)).toEqual([]);
    expect(errorsOf({ es: '', en: 'Chest' }, false)).toEqual(['translatableDefault']);
    expect(errorsOf({ es: 'Pecho', en: 'Chest!!' }, true)).toEqual(['maxLength']);
  });
});

describe('slugs', () => {
  it('suggests one from a name, without accents or symbols', () => {
    expect(slugify('Press de banca (pausa)')).toBe('press-de-banca-pausa');
    expect(slugify('  Jalón al pecho — agarre neutro ')).toBe('jalon-al-pecho-agarre-neutro');
  });

  it('validates like the API pattern', () => {
    expect(slugError('press-banca', 80)).toBeUndefined();
    expect(slugError('', 80)?.kind).toBe('required');
    expect(slugError('Press_Banca', 80)?.kind).toBe('slug');
    expect(slugError('a--b', 80)?.kind).toBe('slug');
    expect(slugError('abc', 2)?.kind).toBe('maxLength');
  });
});
