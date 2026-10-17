import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { safeReturnUrl } from '../../core/auth/auth.guards';
import { AuthStore } from '../../core/auth/auth.store';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';

@Component({
  selector: 'app-login-page',
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
    <h1>{{ 'auth.login.title' | transloco }}</h1>
    <p class="subtitle">{{ 'auth.login.subtitle' | transloco }}</p>

    <form [formRoot]="loginForm">
      <mat-form-field>
        <mat-label>{{ 'auth.fields.email' | transloco }}</mat-label>
        <input matInput type="email" autocomplete="email" [formField]="loginForm.email" />
        <mat-error>{{ loginForm.email().errors() | validationMessage }}</mat-error>
      </mat-form-field>

      <mat-form-field>
        <mat-label>{{ 'auth.fields.password' | transloco }}</mat-label>
        <input
          matInput
          autocomplete="current-password"
          [type]="hidePassword() ? 'password' : 'text'"
          [formField]="loginForm.password"
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
        <mat-error>{{ loginForm.password().errors() | validationMessage }}</mat-error>
      </mat-form-field>

      <div class="actions">
        <a routerLink="/forgot-password">{{ 'auth.login.forgot' | transloco }}</a>
      </div>

      <button mat-flat-button type="submit" [disabled]="loginForm().submitting()">
        {{ 'auth.login.submit' | transloco }}
      </button>
    </form>

    <p class="alt">
      {{ 'auth.login.noAccount' | transloco }}
      <a routerLink="/register">{{ 'auth.login.toRegister' | transloco }}</a>
    </p>
  `,
  styleUrl: './auth-form.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** Bound from the query string (`withComponentInputBinding`). */
  readonly returnUrl = input<string>();

  protected readonly hidePassword = signal(true);

  protected readonly loginForm = form(
    signal({ email: '', password: '' }),
    (path) => {
      required(path.email);
      email(path.email);
      required(path.password);
    },
    {
      submission: {
        action: async (field) => {
          try {
            await this.auth.login(field().value());
            await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
          } catch {
            // errorInterceptor already showed the translated reason.
          }
          return undefined;
        },
      },
    },
  );
}
