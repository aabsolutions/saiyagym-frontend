import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { map } from 'rxjs';
import { PreferencesDto } from '../../api/models/preferences-dto';
import { AuthStore } from '../auth/auth.store';
import {
  DEFAULT_LANGUAGE,
  LanguageCode,
  isSupportedLanguage,
  matchLanguage,
} from '../i18n/languages';

export type ThemePreference = PreferencesDto['theme'];
export type UnitSystem = PreferencesDto['units'];

interface PreferencesState {
  theme: ThemePreference;
  language: LanguageCode;
  units: UnitSystem;
}

const STORAGE_KEY = 'sg.prefs';

function readLocal(): Partial<PreferencesState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<PreferencesState>;
  } catch {
    return {};
  }
}

function writeLocal(state: PreferencesState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: preferences last for this visit only.
  }
}

function initialState(): PreferencesState {
  const saved = readLocal();
  const browser = typeof navigator !== 'undefined' ? matchLanguage(navigator.language) : null;
  return {
    theme: saved.theme ?? 'system',
    language: isSupportedLanguage(saved.language) ? saved.language : (browser ?? DEFAULT_LANGUAGE),
    units: saved.units ?? 'metric',
  };
}

/**
 * UI preferences. Guests keep them in localStorage; once signed in the server copy wins
 * and every change is PATCHed to /users/me so web and mobile stay in sync.
 */
export const PreferencesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    _auth: inject(AuthStore),
    _transloco: inject(TranslocoService),
    _document: inject(DOCUMENT),
    _systemDark: toSignal(
      inject(BreakpointObserver)
        .observe('(prefers-color-scheme: dark)')
        .pipe(map((state) => state.matches)),
      { initialValue: false },
    ),
  })),
  withComputed(({ theme, _systemDark }) => ({
    resolvedTheme: computed<'light' | 'dark'>(() => {
      const pref = theme();
      return pref === 'system' ? (_systemDark() ? 'dark' : 'light') : pref;
    }),
  })),
  withMethods((store) => {
    const save = async (patch: Partial<PreferencesState>): Promise<void> => {
      const previous = { theme: store.theme(), language: store.language(), units: store.units() };
      patchState(store, patch);
      if (!store._auth.isAuthenticated()) return;
      try {
        await store._auth.updateMe({ preferences: patch });
      } catch {
        patchState(store, previous); // the snackbar already explained why
      }
    };

    return {
      setTheme: (theme: ThemePreference) => save({ theme }),
      setLanguage: (language: LanguageCode) => save({ language }),
      setUnits: (units: UnitSystem) => save({ units }),
      toggleTheme: () => save({ theme: store.resolvedTheme() === 'dark' ? 'light' : 'dark' }),
    };
  }),
  withHooks({
    onInit(store) {
      // Server preferences win as soon as the user is known.
      effect(() => {
        const prefs = store._auth.user()?.preferences;
        if (!prefs) return;
        patchState(store, {
          theme: prefs.theme,
          units: prefs.units,
          ...(isSupportedLanguage(prefs.language) && { language: prefs.language }),
        });
      });

      // 'system' sets no class: `color-scheme: light dark` lets the OS decide.
      effect(() => {
        const classes = store._document.documentElement.classList;
        classes.toggle('theme-dark', store.theme() === 'dark');
        classes.toggle('theme-light', store.theme() === 'light');
      });

      effect(() => {
        const language = store.language();
        store._transloco.setActiveLang(language);
        store._document.documentElement.lang = language;
      });

      effect(() =>
        writeLocal({ theme: store.theme(), language: store.language(), units: store.units() }),
      );
    },
  }),
);

export type PreferencesStore = InstanceType<typeof PreferencesStore>;
