import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { PASSWORD_MAX, PASSWORD_MIN } from '../auth/register-page';
import { ProfileStore } from './profile.store';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

@Component({
  selector: 'app-change-password-card',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>{{ 'profile.security.changePassword' | transloco }}</mat-card-title>
        <mat-card-subtitle>{{
          'profile.security.changePasswordHint' | transloco
        }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formRoot]="passwordForm" class="stack">
          <!-- Hidden username field: lets password managers update the right entry. -->
          <input type="email" autocomplete="username" [value]="email()" hidden />
          <mat-form-field>
            <mat-label>{{ 'profile.security.currentPassword' | transloco }}</mat-label>
            <input
              matInput
              type="password"
              autocomplete="current-password"
              [formField]="passwordForm.currentPassword"
            />
            <mat-error>{{ passwordForm.currentPassword().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'auth.fields.newPassword' | transloco }}</mat-label>
            <input
              matInput
              type="password"
              autocomplete="new-password"
              [formField]="passwordForm.newPassword"
            />
            <mat-error>{{ passwordForm.newPassword().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'profile.security.confirmPassword' | transloco }}</mat-label>
            <input
              matInput
              type="password"
              autocomplete="new-password"
              [formField]="passwordForm.confirmPassword"
            />
            <mat-error>{{ passwordForm.confirmPassword().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <div>
            <button mat-flat-button type="submit" [disabled]="passwordForm().submitting()">
              {{ 'profile.security.changePassword' | transloco }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
})
export class ChangePasswordCard {
  private readonly store = inject(ProfileStore);

  private readonly auth = inject(AuthStore);
  protected readonly email = computed(() => this.auth.user()?.email ?? '');
  private readonly model = signal({ ...EMPTY });

  protected readonly passwordForm = form(
    this.model,
    (path) => {
      required(path.currentPassword);
      required(path.newPassword);
      minLength(path.newPassword, PASSWORD_MIN);
      maxLength(path.newPassword, PASSWORD_MAX);
      required(path.confirmPassword);
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() && value() !== valueOf(path.newPassword) ? { kind: 'passwordMismatch' } : undefined,
      );
    },
    {
      submission: {
        action: async (field) => {
          const { currentPassword, newPassword } = field().value();
          if (await this.store.changePassword({ currentPassword, newPassword })) {
            this.passwordForm().reset({ ...EMPTY });
          }
          return undefined;
        },
      },
    },
  );
}
