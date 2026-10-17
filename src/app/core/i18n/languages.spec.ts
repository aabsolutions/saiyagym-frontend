import es from '../../../../public/assets/i18n/es.json';
import en from '../../../../public/assets/i18n/en.json';
import { LANGUAGES, isSupportedLanguage, matchLanguage } from './languages';

const flatKeys = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

describe('languages', () => {
  it('matches BCP 47 tags to supported languages', () => {
    expect(matchLanguage('en-US')).toBe('en');
    expect(matchLanguage('ES')).toBe('es');
    expect(matchLanguage('fr-FR')).toBeNull();
    expect(matchLanguage(undefined)).toBeNull();
  });

  it('knows which codes are supported', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['es', 'en']);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('de')).toBe(false);
  });

  it('every dictionary has exactly the keys of the default (es) one', () => {
    expect(flatKeys(en).sort()).toEqual(flatKeys(es).sort());
  });
});
