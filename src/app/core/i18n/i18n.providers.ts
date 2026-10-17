import { HttpClient } from '@angular/common/http';
import { EnvironmentProviders, Injectable, inject, isDevMode } from '@angular/core';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from './languages';

/** Loads `assets/i18n/<lang>.json` at runtime (relative URL, so it honours the base href). */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`assets/i18n/${lang}.json`);
  }
}

export function provideI18n(): EnvironmentProviders[] {
  return provideTransloco({
    config: {
      availableLangs: [...LANGUAGE_CODES],
      defaultLang: DEFAULT_LANGUAGE,
      fallbackLang: DEFAULT_LANGUAGE,
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
      missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
    },
    loader: TranslocoHttpLoader,
  });
}
