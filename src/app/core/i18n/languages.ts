/**
 * Supported UI languages. Adding one = drop `public/assets/i18n/<code>.json` and add a row here.
 * `label` is the language's own name (endonym), so it is not translated.
 */
export const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const satisfies readonly { code: string; label: string }[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'es';

export const LANGUAGE_CODES: readonly LanguageCode[] = LANGUAGES.map((l) => l.code);

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return !!code && (LANGUAGE_CODES as readonly string[]).includes(code);
}

/** Best match for a BCP 47 tag such as `en-US`, or null. */
export function matchLanguage(tag: string | null | undefined): LanguageCode | null {
  const base = tag?.toLowerCase().split('-')[0];
  return isSupportedLanguage(base) ? base : null;
}
