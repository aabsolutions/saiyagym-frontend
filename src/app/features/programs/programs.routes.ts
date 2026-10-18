import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../shared/ui/unsaved-changes.guard';
import { ProgramListPage } from './program-list-page';
import { ProgramWizardPage } from './program-wizard-page';
import { ProgramWizardStore } from './program-wizard.store';
import { ProgramsShell } from './programs-shell';
import { ProgramsStore } from './programs.store';
import { TemplateGalleryPage } from './template-gallery-page';
import { TemplatePreviewPage } from './template-preview-page';
import { TemplatesStore } from './templates.store';
import { WeekPage } from './week-page';
import { WeekStore } from './week.store';

const programsRoutes: Routes = [
  {
    path: '',
    // Feature-wide: the wizard, the list and the week view share the user's programs.
    providers: [ProgramsStore, TemplatesStore, WeekStore],
    children: [
      {
        path: '',
        component: ProgramsShell,
        children: [
          { path: '', component: ProgramListPage },
          { path: 'week', component: WeekPage },
          { path: 'templates', component: TemplateGalleryPage },
        ],
      },
      { path: 'templates/:id', component: TemplatePreviewPage },
      {
        path: 'new',
        component: ProgramWizardPage,
        providers: [ProgramWizardStore],
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':id/edit',
        component: ProgramWizardPage,
        providers: [ProgramWizardStore],
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
];

export default programsRoutes;
