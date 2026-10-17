import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe } from '@jsverse/transloco';
import { LANGUAGES } from '../i18n/languages';
import { PreferencesStore } from '../preferences/preferences.store';

@Component({
  selector: 'app-language-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      type="button"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="'toolbar.language' | transloco"
    >
      <mat-icon>translate</mat-icon>
    </button>
    <mat-menu #menu="matMenu">
      @for (lang of languages; track lang.code) {
        <button
          mat-menu-item
          type="button"
          [attr.lang]="lang.code"
          [attr.aria-current]="prefs.language() === lang.code"
          (click)="prefs.setLanguage(lang.code)"
        >
          <mat-icon>{{ prefs.language() === lang.code ? 'check' : '' }}</mat-icon>
          <span>{{ lang.label }}</span>
        </button>
      }
    </mat-menu>
  `,
})
export class LanguageMenu {
  protected readonly prefs = inject(PreferencesStore);
  protected readonly languages = LANGUAGES;
}
