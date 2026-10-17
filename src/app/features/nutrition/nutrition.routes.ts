import { Routes } from '@angular/router';
import { NutritionPage } from './nutrition-page';
import { NutritionStore } from './nutrition.store';

const nutritionRoutes: Routes = [
  {
    path: '',
    providers: [NutritionStore],
    children: [{ path: '', component: NutritionPage }],
  },
];

export default nutritionRoutes;
