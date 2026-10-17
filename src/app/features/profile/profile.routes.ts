import { Routes } from '@angular/router';
import { ProfilePage } from './profile-page';
import { ProfileStore } from './profile.store';

const profileRoutes: Routes = [
  {
    path: '',
    providers: [ProfileStore],
    children: [{ path: '', component: ProfilePage }],
  },
];

export default profileRoutes;
