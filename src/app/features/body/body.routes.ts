import { Routes } from '@angular/router';
import { BodyPage } from './body-page';
import { BodyStore } from './body.store';

const bodyRoutes: Routes = [
  {
    path: '',
    providers: [BodyStore],
    children: [{ path: '', component: BodyPage }],
  },
];

export default bodyRoutes;
