import { Routes } from '@angular/router';
import { HistoryPage } from './history-page';
import { HistoryStore } from './history.store';

const historyRoutes: Routes = [
  {
    path: '',
    providers: [HistoryStore],
    children: [{ path: '', component: HistoryPage }],
  },
];

export default historyRoutes;
