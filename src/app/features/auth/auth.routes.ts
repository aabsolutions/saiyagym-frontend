import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/auth.guards';
import { AuthLayout } from './auth-layout';

/** Mounted at the root: email links point to /verify-email and /reset-password. */
const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        canMatch: [guestGuard],
        loadComponent: () => import('./login-page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        canMatch: [guestGuard],
        loadComponent: () => import('./register-page').then((m) => m.RegisterPage),
      },
      {
        path: 'forgot-password',
        canMatch: [guestGuard],
        loadComponent: () => import('./forgot-password-page').then((m) => m.ForgotPasswordPage),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./reset-password-page').then((m) => m.ResetPasswordPage),
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./verify-email-page').then((m) => m.VerifyEmailPage),
      },
    ],
  },
];

export default authRoutes;
