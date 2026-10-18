import { SchemaPath, readonly, validate } from '@angular/forms/signals';

/** Same pattern as the API (SLUG_PATTERN): lowercase words joined by single dashes. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Press de banca (pausa)" → "press-de-banca-pausa". A suggestion; the admin can edit it. */
export function slugify(text: string, maxLength = 60): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** The first problem with a slug, as a Signal Forms error (or undefined when valid). */
export function slugError(slug: string, maxLength: number) {
  if (!slug) return { kind: 'required' };
  if (slug.length > maxLength) return { kind: 'maxLength', maxLength };
  return SLUG_PATTERN.test(slug) ? undefined : { kind: 'slug' };
}

/**
 * Slugs are set on create and never edited (seeds and templates reference them): validated
 * while `editable()`, read-only otherwise.
 */
export function slugRule(
  path: SchemaPath<string>,
  maxLength: number,
  editable: () => boolean = () => true,
): void {
  validate(path, ({ value }) => (editable() ? slugError(value(), maxLength) : undefined));
  readonly(path, () => !editable());
}
