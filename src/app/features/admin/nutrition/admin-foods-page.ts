import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, debounceTime, from, of, switchMap, tap } from 'rxjs';
import { AdminFoodDto } from '../../../api/models/admin-food-dto';
import { AdminFoodPageDto } from '../../../api/models/admin-food-page-dto';
import { AdminNutritionService } from '../../../api/services/admin-nutrition.service';
import { Notifier } from '../../../core/notify/notifier';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import { FOOD_CATEGORIES, FoodCategory } from '../../nutrition/nutrition-model';
import { FoodDialog, FoodDialogData } from './food-dialog';
import { FoodFormModel, toCreateFoodDto, toUpdateFoodDto } from './nutrition-forms';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-foods-page',
  imports: [
    LocalizedPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let f = filters();
    <div class="toolbar">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.foods.search' | transloco }}</mat-label>
        <mat-icon matPrefix aria-hidden="true">search</mat-icon>
        <input
          matInput
          type="search"
          [value]="f.q"
          (input)="setFilters({ q: $any($event.target).value })"
        />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'nutrition.foods.category' | transloco }}</mat-label>
        <mat-select [value]="f.category" (valueChange)="setFilters({ category: $event })">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (c of categories; track c) {
            <mat-option [value]="c">{{ 'nutrition.categories.' + c | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <span class="spacer"></span>
      <button mat-flat-button type="button" (click)="open(null)">
        <mat-icon>add</mat-icon>{{ 'admin.foods.new' | transloco }}
      </button>
    </div>

    <mat-card appearance="outlined" class="card">
      <div class="scroll" [class.pending]="pending()">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.foods' | transloco
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
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (food of page()?.items ?? []; track food.id) {
              @let name = food.name | localized;
              <tr>
                <th scope="row">
                  {{ name }}<span class="sub">{{ food.slug }}</span>
                </th>
                <td>{{ 'nutrition.categories.' + food.category | transloco }}</td>
                <td class="num">{{ food.per100g.kcal }}</td>
                <td class="num">{{ food.per100g.proteinG }} {{ 'units.g' | transloco }}</td>
                <td class="num">{{ food.per100g.carbsG }} {{ 'units.g' | transloco }}</td>
                <td class="num">{{ food.per100g.fatG }} {{ 'units.g' | transloco }}</td>
                <td class="actions-cell">
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.editItem' | transloco: { name }"
                    (click)="open(food)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="'admin.deleteItem' | transloco: { name }"
                    (click)="remove(food)"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty">{{ 'admin.empty' | transloco }}</td>
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
export class AdminFoodsPage {
  private readonly api = inject(AdminNutritionService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);

  protected readonly categories = FOOD_CATEGORIES;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly filters = signal({
    q: '',
    category: null as FoodCategory | null,
    page: 1,
    revision: 0,
  });
  protected readonly pending = signal(false);
  protected readonly page = toSignal(
    toObservable(this.filters).pipe(
      debounceTime(250),
      tap(() => this.pending.set(true)),
      switchMap(({ q, category, page }) =>
        from(
          this.api.adminFoodsControllerList({
            page,
            limit: PAGE_SIZE,
            ...(q.trim() && { q: q.trim() }),
            ...(category && { category }),
          }),
        ).pipe(catchError(() => of<AdminFoodPageDto | null>(null))),
      ),
      tap(() => this.pending.set(false)),
    ),
    { initialValue: null },
  );

  protected setFilters(patch: { q?: string; category?: FoodCategory | null }): void {
    this.filters.update((f) => ({ ...f, ...patch, page: 1 }));
  }

  protected onPage(event: PageEvent): void {
    this.filters.update((f) => ({ ...f, page: event.pageIndex + 1 }));
  }

  protected open(food: AdminFoodDto | null): void {
    const data: FoodDialogData = { food, save: (model) => this.save(food, model) };
    this.dialog.open(FoodDialog, { data, width: '640px', maxWidth: '95vw' });
  }

  protected remove(food: AdminFoodDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.foods.deleteTitle',
      message: 'admin.foods.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe(async (ok) => {
        if (!ok) return;
        try {
          await this.api.adminFoodsControllerRemove({ id: food.id });
          this.notifier.info('admin.deleted');
          this.refresh();
        } catch {
          // 409 FOOD_IN_USE while a meal uses it: already explained by the snackbar.
        }
      });
  }

  private async save(food: AdminFoodDto | null, model: FoodFormModel): Promise<boolean> {
    try {
      if (food) {
        await this.api.adminFoodsControllerUpdate({ id: food.id, body: toUpdateFoodDto(model) });
      } else {
        await this.api.adminFoodsControllerCreate({ body: toCreateFoodDto(model) });
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
