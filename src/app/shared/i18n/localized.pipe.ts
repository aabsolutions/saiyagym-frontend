import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Translatable, localizeText } from './translatable';

/**
 * `{{ exercise.name | localized }}` → the text in the UI language, else the default one (as the
 * API localizes). For admin screens, which receive the raw `{ es, en }` maps. Impure to follow
 * language changes.
 */
@Pipe({ name: 'localized', pure: false })
export class LocalizedPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(map: Translatable | null | undefined): string {
    return localizeText(map, this.transloco.getActiveLang());
  }
}
