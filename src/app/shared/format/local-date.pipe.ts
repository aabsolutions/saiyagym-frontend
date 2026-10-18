import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { fromIso } from './local-dates';

const formatters = new Map<string, Intl.DateTimeFormat>();
const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * UTC ISO timestamp → date in the user's time zone and active language, via Intl
 * (no Angular locale data to register per language). Impure to follow language changes.
 * A bare local day (`YYYY-MM-DD`) is shown as that very day, never shifted through UTC.
 */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(iso: string | null | undefined, style: 'medium' | 'long' | 'short' = 'medium'): string {
    if (!iso) return '';
    const date = LOCAL_DAY.test(iso) ? fromIso(iso) : new Date(iso);
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
