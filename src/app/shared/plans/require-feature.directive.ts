import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';
import { FeatureKey } from '../../core/plans/entitlements';
import { UpgradeCta } from './upgrade-cta';

/**
 * Renders its content only when the user's plan has `feature`; otherwise the `else`
 * template, or an <app-upgrade-cta> by default. Hides UI only: the API still decides.
 *
 * ```html
 * <section *requireFeature="'progressPhotos'">…</section>
 * <button *requireFeature="'dataExport'; else locked">…</button>
 * ```
 */
// Unprefixed on purpose: `*requireFeature` is the agreed public API of this directive.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[requireFeature]' })
export class RequireFeatureDirective {
  private readonly auth = inject(AuthStore);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);

  readonly requireFeature = input.required<FeatureKey>();
  readonly requireFeatureElse = input<TemplateRef<unknown> | null>(null);

  /** What is on screen, so unrelated signal changes don't rebuild the view. */
  private renderedFor: string | null = null;

  constructor() {
    effect(() => {
      const feature = this.requireFeature();
      const allowed = this.auth.hasFeature(feature);
      const fallback = this.requireFeatureElse();
      const key = `${feature}|${allowed}|${allowed ? '' : fallback ? 'else' : 'cta'}`;
      if (key === this.renderedFor) return;

      this.container.clear();
      if (allowed) {
        this.container.createEmbeddedView(this.template);
      } else if (fallback) {
        this.container.createEmbeddedView(fallback);
      } else {
        this.container.createComponent(UpgradeCta).setInput('feature', feature);
      }
      this.renderedFor = key;
    });
  }
}
