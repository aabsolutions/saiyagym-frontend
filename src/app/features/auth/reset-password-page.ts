import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService as AuthApi } from '../../api/services/auth.service';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { PASSWORD_MAX, PASSWORD_MIN } from './register-page';

/** Target of the reset email: `/reset-password?token=…` (backend APP_WEB_URL). */
@Component({
  selector: 'app-reset-password-page',
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
    <h1>{{ 'auth.reset.title' | transloco }}</h1>

    @if (!token()) {
      <div class="notice error" role="alert">
        <mat-icon aria-hidden="true">link_off</mat-icon>
        <p>{{ 'auth.reset.missingToken' | transloco }}</p>
      </div>
    } @else if (done()) {
      <div class="notice" role="status">
        <mat-icon aria-hidden="true">check_circle</mat-icon>
        <p>{{ 'auth.reset.done' | transloco }}</p>
      </div>
    } @else {
      <form [formRoot]="resetForm">
        <mat-form-field>
          <mat-label>{{ 'auth.fields.newPassword' | transloco }}</mat-label>
          <input
            matInput
            type="password"
            autocomplete="new-password"
            [formField]="resetForm.newPassword"
          />
          <mat-error>{{ resetForm.newPassword().errors() | validationMessage }}</mat-error>
        </mat-form-field>
        <button mat-flat-button type="submit" [disabled]="resetForm().submitting()">
          {{ 'auth.reset.submit' | transloco }}
        </button>
      </form>
    }

    <p class="alt">
      <a [routerLink]="token() && !done() ? '/forgot-password' : '/login'">
        {{ (token() && !done() ? 'auth.forgot.title' : 'auth.forgot.back') | transloco }}
      </a>
    </p>
  `,
  styleUrl: './auth-form.scss',
})
export class ResetPasswordPage {
  private readonly authApi = inject(AuthApi);

  readonly token = input<string>();
  protected readonly done = signal(false);

  protected readonly resetForm = form(
    signal({ newPassword: '' }),
    (path) => {
      required(path.newPassword);
      minLength(path.newPassword, PASSWORD_MIN);
      maxLength(path.newPassword, PASSWORD_MAX);
    },
    {
      submission: {
        action: async (field) => {
          const token = this.token();
          if (!token) return undefined;
          try {
            await this.authApi.authControllerResetPassword({
              body: { token, newPassword: field().value().newPassword },
            });
            this.done.set(true);
          } catch {
            // errorInterceptor already showed the translated reason.
          }
          return undefined;
        },
      },
    },
  );
}
