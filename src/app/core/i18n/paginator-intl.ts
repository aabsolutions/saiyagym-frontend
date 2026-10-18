import { Injectable, Provider, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoService } from '@jsverse/transloco';

/** MatPaginator ships English labels; these follow the active language. */
@Injectable()
export class TranslocoPaginatorIntl extends MatPaginatorIntl {
  private readonly transloco = inject(TranslocoService);

  constructor() {
    super();
    // selectTranslation: fires once the dictionary for the new language is loaded.
    this.transloco
      .selectTranslation()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const t = (key: string) => this.transloco.translate(`paginator.${key}`);
        this.itemsPerPageLabel = t('itemsPerPage');
        this.nextPageLabel = t('next');
        this.previousPageLabel = t('previous');
        this.firstPageLabel = t('first');
        this.lastPageLabel = t('last');
        this.changes.next();
      });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) return this.transloco.translate('paginator.rangeEmpty');
    const from = page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, length);
    return this.transloco.translate('paginator.range', { from, to, length });
  };
}

/**
 * Add to the `providers` of every lazy route that shows a paginator. Not in app.config on
 * purpose: importing `@angular/material/paginator` there pulls the whole paginator (with
 * select, form-field, tooltip) into the initial bundle (+220 kB).
 */
export function providePaginatorI18n(): Provider {
  return { provide: MatPaginatorIntl, useClass: TranslocoPaginatorIntl };
}
