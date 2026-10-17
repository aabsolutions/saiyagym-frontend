import { Routes } from '@angular/router';
import { AdminPage } from './admin-page';
import { AdminStore } from './admin.store';

const adminRoutes: Routes = [
  {
    path: '',
    providers: [AdminStore],
    children: [{ path: '', component: AdminPage }],
  },
];

export default adminRoutes;
