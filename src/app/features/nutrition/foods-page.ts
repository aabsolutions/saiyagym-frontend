import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { FOOD_CATEGORIES, FOOD_TAGS, FoodCategory, FoodTag } from './nutrition-model';
import { FOODS_PAGE_SIZE, NutritionStore } from './nutrition.store';

/** Food search with macros per 100 g. */
@Component({
  selector: 'app-foods-page',
  imports: [
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let filters = store.foodFilters();
    <div class="filters">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.foods.search' | transloco }}</mat-label>
        <mat-icon matPrefix aria-hidden="true">search</mat-icon>
        <input
          matInput
          type="search"
          [value]="filters.q"
          (input)="store.setFoodFilters({ q: $any($event.target).value })"
        />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.foods.category' | transloco }}</mat-label>
        <mat-select [value]="filters.category" (valueChange)="setCategory($event)">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (c of categories; track c) {
            <mat-option [value]="c">{{ 'nutrition.categories.' + c | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>
    <mat-chip-listbox
      class="chips"
      multiple
      [attr.aria-label]="'nutrition.foods.tags' | transloco"
      [value]="filters.tags"
      (change)="setTags($event.value)"
    >
      @for (tag of tags; track tag) {
        <mat-chip-option [value]="tag">{{ 'nutrition.tags.' + tag | transloco }}</mat-chip-option>
      }
    </mat-chip-listbox>

    @if (store.foods(); as page) {
      <div class="scroll" [class.pending]="store.foodsPending()">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'nutrition.foods.caption' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'nutrition.foods.food' | transloco }}</th>
              <th scope="col">{{ 'nutrition.foods.category' | transloco }}</th>
              <th scope="col" class="num">{{ 'units.kcal' | transloco }}</th>
              <th scope="col" class="num">{{ 'nutrition.macros.protein' | transloco }}</th>
              <th scope="col" class="num">{{ 'nutrition.macros.carbs' | transloco }}</th>
              <th scope="col" class="num">{{ 'nutrition.macros.fat' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            @for (food of page.items; track food.id) {
              <tr>
                <th scope="row">
                  {{ food.name }}
                  @if (food.tags.length) {
                    <span class="sub">
                      @for (tag of food.tags; track tag; let last = $last) {
                        {{ 'nutrition.tags.' + tag | transloco }}{{ last ? '' : ' · ' }}
                      }
                    </span>
                  }
                </th>
                <td>{{ 'nutrition.categories.' + food.category | transloco }}</td>
                <td class="num">{{ food.per100g.kcal }}</td>
                <td class="num">{{ food.per100g.proteinG }} {{ 'units.g' | transloco }}</td>
                <td class="num">{{ food.per100g.carbsG }} {{ 'units.g' | transloco }}</td>
                <td class="num">{{ food.per100g.fatG }} {{ 'units.g' | transloco }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">{{ 'nutrition.foods.empty' | transloco }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="disclaimer">{{ 'nutrition.foods.per100' | transloco }}</p>
      <mat-paginator
        [length]="page.meta.total"
        [pageIndex]="filters.page - 1"
        [pageSize]="pageSize"
        [hidePageSize]="true"
        (page)="onPage($event)"
      />
    } @else {
      <p class="empty">{{ 'common.loading' | transloco }}</p>
    }
  `,
  styleUrl: './nutrition-page.scss',
  styles: `
    .sub {
      display: block;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class FoodsPage {
  protected readonly store = inject(NutritionStore);
  protected readonly categories = FOOD_CATEGORIES;
  protected readonly tags = FOOD_TAGS;
  protected readonly pageSize = FOODS_PAGE_SIZE;

  constructor() {
    this.store.activate('foods');
  }

  protected setCategory(category: FoodCategory | null): void {
    this.store.setFoodFilters({ category });
  }

  protected setTags(tags: FoodTag[]): void {
    this.store.setFoodFilters({ tags });
  }

  protected onPage(event: PageEvent): void {
    this.store.setFoodPage(event.pageIndex + 1);
  }
}
