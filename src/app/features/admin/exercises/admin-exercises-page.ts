import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminExerciseDto } from '../../../api/models/admin-exercise-dto';
import { MUSCLES, Muscle } from '../../../shared/exercises/exercise-taxonomy';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import { ADMIN_EXERCISES_PAGE_SIZE, AdminExercisesStore } from './admin-exercises.store';

@Component({
  selector: 'app-admin-exercises-page',
  imports: [
    LocalizedPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    RouterLink,
    TranslocoPipe,
  ],
  providers: [AdminExercisesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-label>{{ 'admin.exercises.search' | transloco }}</mat-label>
        <mat-icon matPrefix aria-hidden="true">search</mat-icon>
        <input
          matInput
          type="search"
          [value]="store.q()"
          (input)="store.setQuery($any($event.target).value)"
        />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'exercises.filters.muscle' | transloco }}</mat-label>
        <mat-select [value]="store.muscle()" (valueChange)="setMuscle($event)">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (m of muscles; track m) {
            <mat-option [value]="m">{{ 'exercises.muscles.' + m | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <span class="spacer"></span>
      <a mat-flat-button routerLink="/admin/exercises/new">
        <mat-icon>add</mat-icon>{{ 'admin.exercises.new' | transloco }}
      </a>
    </div>

    <mat-card appearance="outlined" class="card">
      <div class="scroll" [class.pending]="store.pending()">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.exercises' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.fields.name' | transloco }}</th>
              <th scope="col">{{ 'exercises.filters.muscle' | transloco }}</th>
              <th scope="col">{{ 'exercises.filters.equipment' | transloco }}</th>
              <th scope="col">{{ 'admin.exercises.tiers' | transloco }}</th>
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (ex of store.items(); track ex.id) {
              <tr>
                <th scope="row">
                  {{ ex.name | localized }}
                  <span class="sub">{{ ex.slug }}</span>
                </th>
                <td>{{ 'exercises.muscles.' + ex.primaryMuscle | transloco }}</td>
                <td>{{ 'exercises.equipment.' + ex.equipment | transloco }}</td>
                <td>
                  {{ 'profile.goal.hypertrophy' | transloco }}: {{ ex.tiers.hypertrophy ?? '—' }}
                  <span class="sub">
                    {{ 'profile.goal.powerlifting' | transloco }}:
                    {{ ex.tiers.powerlifting ?? '—' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <a
                    mat-icon-button
                    [routerLink]="['/admin/exercises', ex.id]"
                    [attr.aria-label]="
                      'admin.editItem' | transloco: { name: (ex.name | localized) }
                    "
                  >
                    <mat-icon>edit</mat-icon>
                  </a>
                  <button
                    mat-icon-button
                    type="button"
                    [attr.aria-label]="
                      'admin.deleteItem' | transloco: { name: (ex.name | localized) }
                    "
                    (click)="remove(ex)"
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
        [length]="store.total()"
        [pageIndex]="store.page() - 1"
        [pageSize]="pageSize"
        [hidePageSize]="true"
        (page)="onPage($event)"
      />
    </mat-card>
  `,
  styleUrl: '../admin.scss',
})
export class AdminExercisesPage {
  protected readonly store = inject(AdminExercisesStore);
  private readonly dialog = inject(MatDialog);
  protected readonly muscles = MUSCLES;
  protected readonly pageSize = ADMIN_EXERCISES_PAGE_SIZE;

  protected setMuscle(muscle: Muscle | null): void {
    this.store.setMuscle(muscle);
  }

  protected onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1);
  }

  protected remove(exercise: AdminExerciseDto): void {
    const data: ConfirmDialogData = {
      title: 'admin.exercises.deleteTitle',
      message: 'admin.exercises.deleteMessage',
      confirm: 'admin.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) void this.store.remove(exercise);
      });
  }
}
