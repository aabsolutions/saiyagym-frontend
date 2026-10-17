import { Routes } from '@angular/router';
import { DashboardPage } from './dashboard-page';
import { DashboardStore } from './dashboard.store';

const dashboardRoutes: Routes = [
  {
    path: '',
    providers: [DashboardStore],
    children: [{ path: '', component: DashboardPage }],
  },
];

export default dashboardRoutes;
