import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../shared/ui/unsaved-changes.guard';
import { RoutineBuilderPage } from './routine-builder-page';
import { RoutineBuilderStore } from './routine-builder.store';
import { RoutineListPage } from './routine-list-page';
import { RoutinesStore } from './routines.store';

const routinesRoutes: Routes = [
  { path: '', component: RoutineListPage, providers: [RoutinesStore] },
  // `new` before `:id`.
  {
    path: 'new',
    component: RoutineBuilderPage,
    providers: [RoutineBuilderStore],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':id',
    component: RoutineBuilderPage,
    providers: [RoutineBuilderStore],
    canDeactivate: [unsavedChangesGuard],
  },
];

export default routinesRoutes;
