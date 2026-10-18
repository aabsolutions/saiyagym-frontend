import { Routes } from '@angular/router';
import { providePaginatorI18n } from '../../core/i18n/paginator-intl';
import { BodyShell } from './body-shell';
import { BodyStore } from './body.store';
import { MeasurementsPage } from './measurements-page';
import { PhotosPage } from './photos-page';
import { PhotosStore } from './photos.store';

const bodyRoutes: Routes = [
  {
    path: '',
    component: BodyShell,
    providers: [providePaginatorI18n()],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'measurements' },
      { path: 'measurements', component: MeasurementsPage, providers: [BodyStore] },
      { path: 'photos', component: PhotosPage, providers: [PhotosStore] },
    ],
  },
];

export default bodyRoutes;
