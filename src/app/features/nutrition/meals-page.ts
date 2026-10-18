import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { MEAL_TYPES, MealType, NUTRITION_GOALS, NutritionGoal } from './nutrition-model';
import { MEALS_PAGE_SIZE, NutritionStore } from './nutrition.store';

/** Meal suggestions by goal and meal type. Free gets the sample ones plus the upgrade path. */
@Component({
  selector: 'app-meals-page',
  imports: [
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatSelectModule,
    TranslocoPipe,
    UpgradeCta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.meals.goal' | transloco }}</mat-label>
        <mat-select [value]="store.mealFilters().goal" (valueChange)="setGoal($event)">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (goal of goals; track goal) {
            <mat-option [value]="goal">{{ 'nutrition.goals.' + goal | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.meals.type' | transloco }}</mat-label>
        <mat-select [value]="store.mealFilters().mealType" (valueChange)="setType($event)">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (type of mealTypes; track type) {
            <mat-option [value]="type">{{ 'nutrition.mealTypes.' + type | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (page(); as p) {
      @if (p.limitedByPlan && p.lockedCount > 0) {
        <app-upgrade-cta
          class="cta"
          feature="fullNutrition"
          customMessageKey="nutrition.meals.locked"
          [limitValue]="p.lockedCount"
        />
      }
      <div class="list" [class.pending]="store.mealsPending()">
        @for (meal of p.items; track meal.id) {
          <mat-expansion-panel class="meal">
            <mat-expansion-panel-header>
              <mat-panel-title>{{ meal.name }}</mat-panel-title>
              <mat-panel-description>
                <strong>{{ meal.totals.kcal }} {{ 'units.kcal' | transloco }}</strong>
                <span class="macros-inline">{{
                  'nutrition.meals.macrosShort'
                    | transloco
                      : { p: meal.totals.proteinG, c: meal.totals.carbsG, f: meal.totals.fatG }
                }}</span>
              </mat-panel-description>
            </mat-expansion-panel-header>
            <mat-chip-set [attr.aria-label]="'nutrition.meals.tags' | transloco">
              <mat-chip>{{ 'nutrition.mealTypes.' + meal.mealType | transloco }}</mat-chip>
              <mat-chip>{{ 'nutrition.goals.' + meal.goal | transloco }}</mat-chip>
            </mat-chip-set>
            @if (meal.description) {
              <p class="description">{{ meal.description }}</p>
            }
            <div class="scroll">
              <table class="sg-table">
                <caption class="cdk-visually-hidden">
                  {{
                    'nutrition.meals.itemsOf' | transloco: { name: meal.name }
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ 'nutrition.foods.food' | transloco }}</th>
                    <th scope="col" class="num">{{ 'nutrition.meals.grams' | transloco }}</th>
                    <th scope="col" class="num">{{ 'units.kcal' | transloco }}</th>
                    <th scope="col" class="num">{{ 'nutrition.macros.protein' | transloco }}</th>
                    <th scope="col" class="num">{{ 'nutrition.macros.carbs' | transloco }}</th>
                    <th scope="col" class="num">{{ 'nutrition.macros.fat' | transloco }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of meal.items; track item.foodId) {
                    <tr>
                      <th scope="row">{{ item.name }}</th>
                      <td class="num">{{ item.grams }} {{ 'units.g' | transloco }}</td>
                      <td class="num">{{ item.kcal }}</td>
                      <td class="num">{{ item.proteinG }} {{ 'units.g' | transloco }}</td>
                      <td class="num">{{ item.carbsG }} {{ 'units.g' | transloco }}</td>
                      <td class="num">{{ item.fatG }} {{ 'units.g' | transloco }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{{ 'nutrition.meals.total' | transloco }}</th>
                    <td></td>
                    <td class="num">{{ meal.totals.kcal }}</td>
                    <td class="num">{{ meal.totals.proteinG }} {{ 'units.g' | transloco }}</td>
                    <td class="num">{{ meal.totals.carbsG }} {{ 'units.g' | transloco }}</td>
                    <td class="num">{{ meal.totals.fatG }} {{ 'units.g' | transloco }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </mat-expansion-panel>
        } @empty {
          <p class="empty">{{ 'nutrition.meals.empty' | transloco }}</p>
        }
      </div>
      @if (p.meta.total > pageSize) {
        <mat-paginator
          [length]="p.meta.total"
          [pageIndex]="store.mealFilters().page - 1"
          [pageSize]="pageSize"
          [hidePageSize]="true"
          (page)="onPage($event)"
        />
      }
      <p class="disclaimer">{{ p.disclaimer }}</p>
    } @else {
      <p class="empty">{{ 'common.loading' | transloco }}</p>
    }
  `,
  styleUrl: './nutrition-page.scss',
})
export class MealsPage {
  protected readonly store = inject(NutritionStore);
  protected readonly goals = NUTRITION_GOALS;
  protected readonly mealTypes = MEAL_TYPES;
  protected readonly pageSize = MEALS_PAGE_SIZE;
  protected readonly page = computed(() => this.store.meals());

  constructor() {
    this.store.activate('meals');
  }

  protected setGoal(goal: NutritionGoal | null): void {
    this.store.setMealFilters({ goal });
  }

  protected setType(mealType: MealType | null): void {
    this.store.setMealFilters({ mealType });
  }

  protected onPage(event: PageEvent): void {
    this.store.setMealPage(event.pageIndex + 1);
  }
}
