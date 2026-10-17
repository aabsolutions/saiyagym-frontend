import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '', loadChildren: () => import('./features/auth/auth.routes') },
  {
    path: '',
    // Lazy: guests (login page) never download the sidenav/toolbar/menu code.
    loadComponent: () => import('./core/layout/shell').then((m) => m.Shell),
    canMatch: [authGuard],
    children: [
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes') },
      { path: 'exercises', loadChildren: () => import('./features/exercises/exercises.routes') },
      { path: 'routines', loadChildren: () => import('./features/routines/routines.routes') },
      { path: 'programs', loadChildren: () => import('./features/programs/programs.routes') },
      { path: 'history', loadChildren: () => import('./features/history/history.routes') },
      { path: 'stats', loadChildren: () => import('./features/stats/stats.routes') },
      { path: 'body', loadChildren: () => import('./features/body/body.routes') },
      { path: 'nutrition', loadChildren: () => import('./features/nutrition/nutrition.routes') },
      { path: 'profile', loadChildren: () => import('./features/profile/profile.routes') },
      {
        path: 'admin',
        canMatch: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes'),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
