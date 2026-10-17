import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  email,
  form,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';

/** Mirrors RegisterDto constraints in openapi.json; the API validates again. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
const NAME_MAX = 80;

@Component({
  selector: 'app-register-page',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ 'auth.register.title' | transloco }}</h1>
    <p class="subtitle">{{ 'auth.register.subtitle' | transloco }}</p>

    <form [formRoot]="registerForm">
      <mat-form-field>
        <mat-label>{{ 'auth.fields.name' | transloco }}</mat-label>
        <input matInput autocomplete="name" [formField]="registerForm.name" />
        <mat-error>{{ registerForm.name().errors() | validationMessage }}</mat-error>
      </mat-form-field>

      <mat-form-field>
        <mat-label>{{ 'auth.fields.email' | transloco }}</mat-label>
        <input matInput type="email" autocomplete="email" [formField]="registerForm.email" />
        <mat-error>{{ registerForm.email().errors() | validationMessage }}</mat-error>
      </mat-form-field>

      <mat-form-field>
        <mat-label>{{ 'auth.fields.password' | transloco }}</mat-label>
        <input
          matInput
          autocomplete="new-password"
          [type]="hidePassword() ? 'password' : 'text'"
          [formField]="registerForm.password"
        />
        <button
          mat-icon-button
          matSuffix
          type="button"
          [attr.aria-label]="
            (hidePassword() ? 'auth.fields.showPassword' : 'auth.fields.hidePassword') | transloco
          "
          (click)="hidePassword.set(!hidePassword())"
        >
          <mat-icon>{{ hidePassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
        </button>
        <mat-error>{{ registerForm.password().errors() | validationMessage }}</mat-error>
      </mat-form-field>

      <button mat-flat-button type="submit" [disabled]="registerForm().submitting()">
        {{ 'auth.register.submit' | transloco }}
      </button>
    </form>

    <p class="alt">
      {{ 'auth.register.haveAccount' | transloco }}
      <a routerLink="/login">{{ 'auth.register.toLogin' | transloco }}</a>
    </p>
  `,
  styleUrl: './auth-form.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthStore);
  private readonly prefs = inject(PreferencesStore);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);

  protected readonly hidePassword = signal(true);

  protected readonly registerForm = form(
    signal({ name: '', email: '', password: '' }),
    (path) => {
      maxLength(path.name, NAME_MAX);
      required(path.email);
      email(path.email);
      required(path.password);
      minLength(path.password, PASSWORD_MIN);
      maxLength(path.password, PASSWORD_MAX);
    },
    {
      submission: {
        action: async (field) => {
          const { name, ...credentials } = field().value();
          try {
            await this.auth.register({
              ...credentials,
              ...(name.trim() && { name: name.trim() }),
              language: this.prefs.language(),
            });
            this.notifier.info('auth.register.verifySent');
            await this.router.navigateByUrl('/dashboard');
          } catch {
            // errorInterceptor already showed the translated reason.
          }
          return undefined;
        },
      },
    },
  );
}
