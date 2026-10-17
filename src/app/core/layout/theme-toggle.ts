import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { PreferencesStore } from '../preferences/preferences.store';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let dark = prefs.resolvedTheme() === 'dark';
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="(dark ? 'toolbar.toLight' : 'toolbar.toDark') | transloco"
      (click)="prefs.toggleTheme()"
    >
      <mat-icon>{{ dark ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggle {
  protected readonly prefs = inject(PreferencesStore);
}
