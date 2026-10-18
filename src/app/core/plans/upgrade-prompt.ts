import { Injectable, Injector, inject } from '@angular/core';
import { PlanRestriction } from './entitlements';

/** Shows the upgrade dialog once at a time (several requests may hit the same limit). */
@Injectable({ providedIn: 'root' })
export class UpgradePrompt {
  private readonly injector = inject(Injector);
  private isOpen = false;

  async open(restriction: PlanRestriction): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;
    try {
      // Lazy (MatDialog included): errorInterceptor is eager, so a static import would put
      // the dialog code in the initial bundle for something most sessions never see.
      const [{ MatDialog }, { UpgradeDialog }] = await Promise.all([
        import('@angular/material/dialog'),
        import('../../shared/plans/upgrade-dialog'),
      ]);
      const ref = this.injector
        .get(MatDialog)
        .open(UpgradeDialog, { data: restriction, maxWidth: '480px' });
      ref.afterClosed().subscribe(() => (this.isOpen = false));
    } catch (error) {
      this.isOpen = false;
      throw error;
    }
  }
}
