import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { LANGUAGES } from '../../core/i18n/languages';
import {
  PreferencesStore,
  ThemePreference,
  UnitSystem,
} from '../../core/preferences/preferences.store';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { ProfileStore } from './profile.store';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const UNIT_SYSTEMS: readonly UnitSystem[] = ['metric', 'imperial'];

@Component({
  selector: 'app-profile-page',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ 'pages.profile.title' | transloco }}</h1>

      <div class="grid">
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>{{ 'pages.profile.profileSection' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formRoot]="profileForm">
              <mat-form-field class="full-width">
                <mat-label>{{ 'auth.fields.name' | transloco }}</mat-label>
                <input matInput autocomplete="name" [formField]="profileForm.name" />
                <mat-error>{{ profileForm.name().errors() | validationMessage }}</mat-error>
              </mat-form-field>
              <button mat-flat-button type="submit" [disabled]="store.isPending()">
                {{ 'common.save' | transloco }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>{{ 'pages.profile.preferencesSection' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content class="prefs">
            <mat-form-field>
              <mat-label>{{ 'pages.profile.language' | transloco }}</mat-label>
              <mat-select
                [value]="prefs.language()"
                (selectionChange)="prefs.setLanguage($event.value)"
              >
                @for (lang of languages; track lang.code) {
                  <mat-option [value]="lang.code">{{ lang.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>{{ 'pages.profile.theme' | transloco }}</mat-label>
              <mat-select [value]="prefs.theme()" (selectionChange)="prefs.setTheme($event.value)">
                @for (theme of themes; track theme) {
                  <mat-option [value]="theme">
                    {{ 'preferences.theme.' + theme | transloco }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>{{ 'pages.profile.units' | transloco }}</mat-label>
              <mat-select [value]="prefs.units()" (selectionChange)="prefs.setUnits($event.value)">
                @for (units of unitSystems; track units) {
                  <mat-option [value]="units">
                    {{ 'preferences.units.' + units | transloco }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      </div>
    </section>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    mat-card-content {
      padding-top: 16px;
    }
    .prefs {
      display: flex;
      flex-direction: column;
    }
  `,
})
export class ProfilePage {
  protected readonly store = inject(ProfileStore);
  protected readonly prefs = inject(PreferencesStore);
  private readonly auth = inject(AuthStore);

  protected readonly languages = LANGUAGES;
  protected readonly themes = THEMES;
  protected readonly unitSystems = UNIT_SYSTEMS;

  protected readonly profileForm = form(
    signal({ name: this.auth.user()?.profile.name ?? '' }),
    (path) => maxLength(path.name, 80),
    {
      submission: {
        action: async (field) => {
          const name = field().value().name.trim();
          await this.store.saveProfile({ name: name || null });
          return undefined;
        },
      },
    },
  );
}
