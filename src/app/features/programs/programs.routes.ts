import { Routes } from '@angular/router';
import { ProgramsPage } from './programs-page';
import { ProgramsStore } from './programs.store';

const programsRoutes: Routes = [
  {
    path: '',
    providers: [ProgramsStore],
    children: [{ path: '', component: ProgramsPage }],
  },
];

export default programsRoutes;
