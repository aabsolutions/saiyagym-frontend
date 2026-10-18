import { Pipe, PipeTransform, inject } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';

/**
 * First signal-forms error of a field, translated: `{{ form.email().errors() | validationMessage }}`.
 * Impure so it follows language changes.
 */
@Pipe({ name: 'validationMessage', pure: false })
export class ValidationMessagePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(errors: readonly ValidationError[] | null | undefined): string {
    const error = errors?.[0];
    if (!error) return '';
    switch (error.kind) {
      case 'required':
        return this.transloco.translate('validation.required');
      case 'email':
        return this.transloco.translate('validation.email');
      case 'minLength':
        return this.transloco.translate('validation.minlength', {
          min: (error as ValidationError & { minLength: number }).minLength,
        });
      case 'maxLength':
        return this.transloco.translate('validation.maxlength', {
          max: (error as ValidationError & { maxLength: number }).maxLength,
        });
      case 'min':
        return this.transloco.translate('validation.min', {
          min: (error as ValidationError & { min: number }).min,
        });
      case 'max':
        return this.transloco.translate('validation.max', {
          max: (error as ValidationError & { max: number }).max,
        });
      // App-specific kinds, raised by our own `validate()` rules.
      case 'futureDate':
        return this.transloco.translate('validation.futureDate');
      case 'passwordMismatch':
        return this.transloco.translate('validation.passwordMismatch');
      case 'confirmationMismatch':
        return this.transloco.translate('validation.confirmationMismatch');
      case 'noMeasurement':
        return this.transloco.translate('validation.noMeasurement');
      default:
        // Server-side errors carry an already-localized message.
        return error.message ?? this.transloco.translate('errors.VALIDATION_ERROR');
    }
  }
}
