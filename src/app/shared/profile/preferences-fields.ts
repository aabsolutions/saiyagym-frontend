import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { LANGUAGES } from '../../core/i18n/languages';
import {
  PreferencesStore,
  ThemePreference,
  UnitSystem,
} from '../../core/preferences/preferences.store';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const UNIT_SYSTEMS: readonly UnitSystem[] = ['metric', 'imperial'];

/** Language / theme / units, applied (and saved) as soon as they change. */
@Component({
  selector: 'app-preferences-fields',
  imports: [MatFormFieldModule, MatSelectModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field>
      <mat-label>{{ 'profile.fields.language' | transloco }}</mat-label>
      <mat-select [value]="prefs.language()" (selectionChange)="prefs.setLanguage($event.value)">
        @for (lang of languages; track lang.code) {
          <mat-option [value]="lang.code" [attr.lang]="lang.code">{{ lang.label }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    <mat-form-field>
      <mat-label>{{ 'profile.fields.units' | transloco }}</mat-label>
      <mat-select [value]="prefs.units()" (selectionChange)="prefs.setUnits($event.value)">
        @for (units of unitSystems; track units) {
          <mat-option [value]="units">{{ 'preferences.units.' + units | transloco }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    @if (showTheme()) {
      <mat-form-field>
        <mat-label>{{ 'profile.fields.theme' | transloco }}</mat-label>
        <mat-select [value]="prefs.theme()" (selectionChange)="prefs.setTheme($event.value)">
          @for (theme of themes; track theme) {
            <mat-option [value]="theme">{{ 'preferences.theme.' + theme | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0 16px;
    }
  `,
})
export class PreferencesFields {
  protected readonly prefs = inject(PreferencesStore);
  readonly showTheme = input(true);

  protected readonly languages = LANGUAGES;
  protected readonly themes = THEMES;
  protected readonly unitSystems = UNIT_SYSTEMS;
}
