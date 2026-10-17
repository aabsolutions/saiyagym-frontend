import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService as AuthApi } from '../../api/services/auth.service';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';

@Component({
  selector: 'app-forgot-password-page',
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
    <h1>{{ 'auth.forgot.title' | transloco }}</h1>
    <p class="subtitle">{{ 'auth.forgot.subtitle' | transloco }}</p>

    @if (sent()) {
      <div class="notice" role="status">
        <mat-icon aria-hidden="true">mark_email_read</mat-icon>
        <p>{{ 'auth.forgot.sent' | transloco }}</p>
      </div>
    } @else {
      <form [formRoot]="forgotForm">
        <mat-form-field>
          <mat-label>{{ 'auth.fields.email' | transloco }}</mat-label>
          <input matInput type="email" autocomplete="email" [formField]="forgotForm.email" />
          <mat-error>{{ forgotForm.email().errors() | validationMessage }}</mat-error>
        </mat-form-field>
        <button mat-flat-button type="submit" [disabled]="forgotForm().submitting()">
          {{ 'auth.forgot.submit' | transloco }}
        </button>
      </form>
    }

    <p class="alt">
      <a routerLink="/login">{{ 'auth.forgot.back' | transloco }}</a>
    </p>
  `,
  styleUrl: './auth-form.scss',
})
export class ForgotPasswordPage {
  private readonly authApi = inject(AuthApi);

  protected readonly sent = signal(false);

  protected readonly forgotForm = form(
    signal({ email: '' }),
    (path) => {
      required(path.email);
      email(path.email);
    },
    {
      submission: {
        action: async (field) => {
          try {
            // The API answers the same whether the email exists or not (no user enumeration).
            await this.authApi.authControllerForgotPassword({ body: field().value() });
            this.sent.set(true);
          } catch {
            // errorInterceptor already showed the translated reason.
          }
          return undefined;
        },
      },
    },
  );
}
