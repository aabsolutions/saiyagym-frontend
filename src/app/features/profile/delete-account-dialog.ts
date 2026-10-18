import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { ProfileStore } from './profile.store';

/**
 * Two locks before deleting: retype a confirmation word and the password (the API
 * re-authenticates, so a stolen access token alone can't delete the account).
 * Stays open on a wrong password.
 */
@Component({
  selector: 'app-delete-account-dialog',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="deleteForm">
      <h2 mat-dialog-title>{{ 'profile.danger.deleteTitle' | transloco }}</h2>
      <mat-dialog-content>
        <p>{{ 'profile.danger.deleteWarning' | transloco }}</p>
        <mat-form-field class="full-width">
          <mat-label>
            {{ 'profile.danger.typeToConfirm' | transloco: { word: confirmWord() } }}
          </mat-label>
          <input matInput autocomplete="off" [formField]="deleteForm.confirmation" />
          <mat-error>{{ deleteForm.confirmation().errors() | validationMessage }}</mat-error>
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>{{ 'auth.fields.password' | transloco }}</mat-label>
          <input
            matInput
            type="password"
            autocomplete="current-password"
            [formField]="deleteForm.password"
          />
          <mat-error>{{ deleteForm.password().errors() | validationMessage }}</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>
          {{ 'common.cancel' | transloco }}
        </button>
        <button mat-flat-button type="submit" class="danger" [disabled]="deleteForm().submitting()">
          {{ 'profile.danger.deleteConfirm' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class DeleteAccountDialog {
  private readonly store = inject(ProfileStore);
  private readonly dialogRef = inject(MatDialogRef<DeleteAccountDialog>);
  private readonly transloco = inject(TranslocoService);

  /** Localized ("ELIMINAR" / "DELETE"), read when the dialog opens. */
  protected readonly confirmWord = signal(this.transloco.translate('profile.danger.confirmWord'));

  protected readonly deleteForm = form(
    signal({ confirmation: '', password: '' }),
    (path) => {
      required(path.confirmation);
      validate(path.confirmation, ({ value }) =>
        value() && value().trim().toUpperCase() !== this.confirmWord().toUpperCase()
          ? { kind: 'confirmationMismatch' }
          : undefined,
      );
      required(path.password);
    },
    {
      submission: {
        action: async (field) => {
          if (await this.store.deleteAccount(field().value().password)) this.dialogRef.close(true);
          return undefined;
        },
      },
    },
  );
}
