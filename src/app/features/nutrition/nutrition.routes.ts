import { Routes } from '@angular/router';
import { providePaginatorI18n } from '../../core/i18n/paginator-intl';
import { CalculatorPage } from './calculator-page';
import { FoodsPage } from './foods-page';
import { GuidelinesPage } from './guidelines-page';
import { MealsPage } from './meals-page';
import { NutritionShell } from './nutrition-shell';
import { NutritionStore } from './nutrition.store';

const nutritionRoutes: Routes = [
  {
    path: '',
    // Feature-wide: filters and the last result survive switching tabs.
    providers: [NutritionStore, providePaginatorI18n()],
    component: NutritionShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'calculator' },
      { path: 'calculator', component: CalculatorPage },
      { path: 'meals', component: MealsPage },
      { path: 'guidelines', component: GuidelinesPage },
      { path: 'foods', component: FoodsPage },
    ],
  },
];

export default nutritionRoutes;
