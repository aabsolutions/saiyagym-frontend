import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * UTC ISO timestamp → date in the user's time zone and active language, via Intl
 * (no Angular locale data to register per language). Impure to follow language changes.
 */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(iso: string | null | undefined, style: 'medium' | 'long' | 'short' = 'medium'): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const lang = this.transloco.getActiveLang();
    const key = `${lang}|${style}`;
    let formatter = formatters.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(lang, { dateStyle: style });
      formatters.set(key, formatter);
    }
    return formatter.format(date);
  }
}
