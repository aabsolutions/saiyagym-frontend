import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  /** Already-translated text (e.g. an API error message). */
  show(message: string, kind: 'info' | 'error' = 'info'): void {
    this.snackBar.open(message, this.transloco.translate('common.close'), {
      duration: kind === 'error' ? 6000 : 4000,
      panelClass: kind === 'error' ? 'sg-snack-error' : undefined,
      politeness: kind === 'error' ? 'assertive' : 'polite',
    });
  }

  info(key: string, params?: Record<string, unknown>): void {
    this.show(this.transloco.translate(key, params), 'info');
  }

  error(message: string): void {
    this.show(message, 'error');
  }
}
