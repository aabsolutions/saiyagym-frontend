import { SchemaPath, validate } from '@angular/forms/signals';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '../../core/i18n/languages';

/**
 * DB content translated per language: `{ es: '…', en: '…' }`. The API (IsTranslatable) requires
 * the default language, accepts any language code, and rejects blank values — so the editor
 * keeps every configured language as a field and `toTranslatable` drops the empty ones.
 */
export type Translatable = Record<string, string>;

/** One entry per configured language (plus any extra one the content already had). */
export function fromTranslatable(map: Translatable | null | undefined): Translatable {
  const model: Translatable = Object.fromEntries(LANGUAGE_CODES.map((code) => [code, '']));
  for (const [code, text] of Object.entries(map ?? {})) model[code] = text;
  return model;
}

/** What the API accepts: trimmed, blanks omitted. */
export function toTranslatable(model: Translatable): Translatable {
  return Object.fromEntries(
    Object.entries(model)
      .map(([code, text]) => [code, text.trim()] as const)
      .filter(([, text]) => text.length > 0),
  );
}

/** Optional translatable fields: `undefined` when nothing was written. */
export function toOptionalTranslatable(model: Translatable): Translatable | undefined {
  const map = toTranslatable(model);
  return Object.keys(map).length ? map : undefined;
}

/** Configured languages without text (the editor marks their tabs). */
export const missingLanguages = (model: Translatable): string[] =>
  LANGUAGE_CODES.filter((code) => !model[code]?.trim());

/** Content text in the UI language, falling back to the default one (like the API). */
export const localizeText = (map: Translatable | null | undefined, lang: string): string =>
  map?.[lang]?.trim() || map?.[DEFAULT_LANGUAGE] || '';

/**
 * Signal Forms rules for a translatable field: the default language is required (unless the
 * whole field is optional and empty) and every language respects `maxLength`.
 */
export function translatable(
  path: SchemaPath<Translatable>,
  options: { required?: boolean; maxLength: number },
): void {
  validate(path, ({ value }) => {
    const map = value();
    const written = Object.values(map).some((text) => text.trim());
    if ((options.required || written) && !map[DEFAULT_LANGUAGE]?.trim()) {
      return { kind: 'translatableDefault' };
    }
    const tooLong = Object.values(map).some((text) => text.trim().length > options.maxLength);
    return tooLong ? { kind: 'maxLength', maxLength: options.maxLength } : undefined;
  });
}
