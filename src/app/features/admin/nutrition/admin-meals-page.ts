import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, from, of, switchMap, tap } from 'rxjs';
import { AdminMealSuggestionDto } from '../../../api/models/admin-meal-suggestion-dto';
import { AdminMealSuggestionPageDto } from '../../../api/models/admin-meal-suggestion-page-dto';
import { AdminNutritionService } from '../../../api/services/admin-nutrition.service';
import { Notifier } from '../../../core/notify/notifier';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { localizeText } from '../../../shared/i18n/translatable';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import {
  MEAL_TYPES,
  MealType,
  NUTRITION_GOALS,
  NutritionGoal,
} from '../../nutrition/nutrition-model';
import { MealDialog, MealDialogData } from './meal-dialog';
import { MealFormModel, toCreateMealDto, toUpdateMealDto } from './nutrition-forms';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-meals-page',
  imports: [
    LocalizedPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let f = filters();
    <div class="toolbar">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.meals.goal' | transloco }}</mat-label>
        <mat-select [value]="f.goal" (valueChange)="setFilters({ goal: $event })">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (g of goals; track g) {
            <mat-option [value]="g">{{ 'nutrition.goals.' + g | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.meals.type' | transloco }}</mat-label>
        <mat-select [value]="f.mealType" (valueChange)="setFilters({ mealType: $event })">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (t of mealTypes; track t) {
            <mat-option [value]="t">{{ 'nutrition.mealTypes.' + t | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <span class="spacer"></span>
      <button mat-flat-button type="button" (click)="open(null)">
        <mat-icon>add</mat-icon>{{ 'admin.meals.new' | transloco }}
      </button>
    </div>

    <mat-card appearance="outlined" class="card">
      <div class="scroll" [class.pending]="pending()">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.meals' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.fields.name' | transloco }}</th>
              <th scope="col">{{ 'nutrition.meals.type' | transloco }}</th>
              <th scope="col">{{ 'nutrition.meals.goal' | transloco }}</th>
              <th scope="col">{{ 'admin.meals.items' | transloco }}</th>
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (meal of page()?.items ?? []; track meal.id) {
              @let name = meal.name | localized;
              <tr>
                <th scope="row">
                  {{ name }}
                  @if (meal.isSample) {
                    <span class="badge">{{ 'admin.meals.sample' | transloco }}</span>
                  }
                  <span class="sub">{{ meal.slug }}</span>
                </th>
                <td>{{ 'nutrition.mealTypes.' + meal.mealType | transloco }}</td>
                <td>{{ 'nutrition.goals.' + meal.goal | transloco }}</td>
                <td class="num">{{ meal.items.length }}</td>
                <td class="actions-cell">
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.editItem' | transloco: { name }"
                    (click)="open(meal)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.deleteItem' | transloco: { name }"
                    (click)="remove(meal)"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">{{ 'admin.empty' | transloco }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <mat-paginator
        [length]="page()?.meta?.total ?? 0"
        [pageIndex]="f.page - 1"
        [pageSize]="pageSize"
        [hidePageSize]="true"
        (page)="onPage($event)"
      />
    </mat-card>
  `,
  styleUrl: '../admin.scss',
})
export class AdminMealsPage {
  private readonly api = inject(AdminNutritionService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly transloco = inject(TranslocoService);

  protected readonly goals = NUTRITION_GOALS;
  protected readonly mealTypes = MEAL_TYPES;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly filters = signal({
    goal: null as NutritionGoal | null,
    mealType: null as MealType | null,
    page: 1,
    revision: 0,
  });
  protected readonly pending = signal(false);
  protected readonly page = toSignal(
    toObservable(this.filters).pipe(
      tap(() => this.pending.set(true)),
      switchMap(({ goal, mealType, page }) =>
        from(
          this.api.adminMealSuggestionsControllerList({
            page,
            limit: PAGE_SIZE,
            ...(goal && { goal }),
            ...(mealType && { mealType }),
          }),
        ).pipe(catchError(() => of<AdminMealSuggestionPageDto | null>(null))),
      ),
      tap(() => this.pending.set(false)),
    ),
    { initialValue: null },
  );

  protected setFilters(patch: { goal?: NutritionGoal | null; mealType?: MealType | null }): void {
    this.filters.update((f) => ({ ...f, ...patch, page: 1 }));
  }

  protected onPage(event: PageEvent): void {
    this.filters.update((f) => ({ ...f, page: event.pageIndex + 1 }));
  }

  protected async open(meal: AdminMealSuggestionDto | null): Promise<void> {
    const data: MealDialogData = {
      meal,
      foodNames: await this.foodNames(meal),
      save: (model) => this.save(meal, model),
    };
    this.dialog.open(MealDialog, { data, width: '720px', maxWidth: '95vw' });
  }

  protected remove(meal: AdminMealSuggestionDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.meals.deleteTitle',
      message: 'admin.meals.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe(async (ok) => {
        if (!ok) return;
        try {
          await this.api.adminMealSuggestionsControllerRemove({ id: meal.id });
          this.notifier.info('admin.deleted');
          this.refresh();
        } catch {
          // errorInterceptor already reported it.
        }
      });
  }

  /**
   * Admin meals reference foods by slug only, and the food search matches names, not slugs.
   * The catalog is small: load every food once (100 per page) into a slug → name index.
   */
  private foodIndex: Promise<Map<string, string>> | null = null;

  private foodNames(meal: AdminMealSuggestionDto | null): Promise<Map<string, string>> {
    if (!meal?.items.length) return Promise.resolve(new Map());
    this.foodIndex ??= this.loadFoodIndex();
    return this.foodIndex;
  }

  private async loadFoodIndex(): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const lang = this.transloco.getActiveLang();
    try {
      for (let page = 1; ; page++) {
        const result = await this.api.adminFoodsControllerList({ page, limit: 100 });
        for (const food of result.items) names.set(food.slug, localizeText(food.name, lang));
        if (page * 100 >= result.meta.total || !result.items.length) break;
      }
    } catch {
      this.foodIndex = null; // retry next time; rows show the slug meanwhile
    }
    return names;
  }

  private async save(meal: AdminMealSuggestionDto | null, model: MealFormModel): Promise<boolean> {
    try {
      if (meal) {
        await this.api.adminMealSuggestionsControllerUpdate({
          id: meal.id,
          body: toUpdateMealDto(model),
        });
      } else {
        await this.api.adminMealSuggestionsControllerCreate({ body: toCreateMealDto(model) });
      }
      this.notifier.info('common.saved');
      this.refresh();
      return true;
    } catch {
      return false;
    }
  }

  private refresh(): void {
    this.filters.update((f) => ({ ...f, revision: f.revision + 1 }));
  }
}
