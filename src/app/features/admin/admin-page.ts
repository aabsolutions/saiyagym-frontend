import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { AdminStore } from './admin.store';

@Component({
  selector: 'app-admin-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.admin.title" icon="admin_panel_settings" />`,
})
export class AdminPage {
  protected readonly store = inject(AdminStore);
}
