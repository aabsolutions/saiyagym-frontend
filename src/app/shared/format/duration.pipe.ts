import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/** Seconds → "1 h 05 min" / "45 min" in the active language. Impure: follows language changes. */
@Pipe({ name: 'duration', pure: false })
export class DurationPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || seconds < 0) return '';
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours
      ? this.transloco.translate('format.hoursMinutes', {
          hours,
          minutes: String(minutes).padStart(2, '0'),
        })
      : this.transloco.translate('format.minutes', { minutes });
  }
}
