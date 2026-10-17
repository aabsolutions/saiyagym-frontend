export interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
  adminOnly?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'space_dashboard' },
  { path: '/exercises', labelKey: 'nav.exercises', icon: 'fitness_center' },
  { path: '/routines', labelKey: 'nav.routines', icon: 'list_alt' },
  { path: '/programs', labelKey: 'nav.programs', icon: 'calendar_month' },
  { path: '/history', labelKey: 'nav.history', icon: 'history' },
  { path: '/stats', labelKey: 'nav.stats', icon: 'monitoring' },
  { path: '/body', labelKey: 'nav.body', icon: 'straighten' },
  { path: '/nutrition', labelKey: 'nav.nutrition', icon: 'restaurant' },
  { path: '/profile', labelKey: 'nav.profile', icon: 'person' },
  { path: '/admin', labelKey: 'nav.admin', icon: 'admin_panel_settings', adminOnly: true },
];
