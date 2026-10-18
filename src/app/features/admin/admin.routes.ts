import { Routes } from '@angular/router';
import { providePaginatorI18n } from '../../core/i18n/paginator-intl';
import { AdminShell } from './admin-shell';
import { AdminExerciseEditorPage } from './exercises/admin-exercise-editor-page';
import { AdminExercisesPage } from './exercises/admin-exercises-page';
import { AdminFoodsPage } from './nutrition/admin-foods-page';
import { AdminGuidelinesPage } from './nutrition/admin-guidelines-page';
import { AdminMealsPage } from './nutrition/admin-meals-page';
import { AdminPlansPage } from './plans/admin-plans-page';
import { AdminTagsPage } from './tags/admin-tags-page';
import { AdminTemplatesPage } from './templates/admin-templates-page';
import { TemplateEditorPage } from './templates/template-editor-page';
import { AdminTiersPage } from './tiers/admin-tiers-page';
import { AdminUsersPage } from './users/admin-users-page';

/** Matched only for admins (adminGuard in app.routes). The API checks the role again. */
const adminRoutes: Routes = [
  {
    path: '',
    providers: [providePaginatorI18n()],
    children: [
      {
        path: '',
        component: AdminShell,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users' },
          { path: 'users', component: AdminUsersPage },
          { path: 'plans', component: AdminPlansPage },
          { path: 'exercises', component: AdminExercisesPage },
          { path: 'tiers', component: AdminTiersPage },
          { path: 'tags', component: AdminTagsPage },
          { path: 'templates', component: AdminTemplatesPage },
          { path: 'foods', component: AdminFoodsPage },
          { path: 'meals', component: AdminMealsPage },
          { path: 'guidelines', component: AdminGuidelinesPage },
        ],
      },
      // Editors are full pages (outside the tabs) so long forms get the whole width.
      { path: 'exercises/new', component: AdminExerciseEditorPage },
      { path: 'exercises/:id', component: AdminExerciseEditorPage },
      { path: 'templates/new', component: TemplateEditorPage },
      { path: 'templates/:id', component: TemplateEditorPage },
    ],
  },
];

export default adminRoutes;
