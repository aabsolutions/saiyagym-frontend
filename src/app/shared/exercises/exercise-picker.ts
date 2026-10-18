import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { MUSCLES, Muscle } from './exercise-taxonomy';

export const PICKER_DEBOUNCE_MS = 300;
const PICKER_PAGE = 30;

interface PickerState {
  loading: boolean;
  items: ExerciseSummaryDto[];
}

/** Search-and-add panel (routine builder). Emits the picked exercise; the parent adds it. */
@Component({
  selector: 'app-exercise-picker',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="full-width" subscriptSizing="dynamic">
      <mat-icon matPrefix>search</mat-icon>
      <mat-label>{{ 'exercises.search' | transloco }}</mat-label>
      <input
        matInput
        type="search"
        maxlength="100"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
    </mat-form-field>
    <mat-form-field class="full-width" subscriptSizing="dynamic">
      <mat-label>{{ 'exercises.filters.muscle' | transloco }}</mat-label>
      <mat-select [value]="muscle()" (selectionChange)="muscle.set($event.value)">
        <mat-option [value]="null">{{ 'exercises.filters.any' | transloco }}</mat-option>
        @for (m of muscles; track m) {
          <mat-option [value]="m">{{ 'exercises.muscles.' + m | transloco }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    @if (state().loading) {
      <mat-progress-bar mode="indeterminate" />
    }
    <ul class="results" [attr.aria-busy]="state().loading">
      @for (exercise of state().items; track exercise.id) {
        <li>
          <span class="text">
            <span class="name">{{ exercise.name }}</span>
            <span class="meta">{{
              'exercises.muscles.' + exercise.primaryMuscle | transloco
            }}</span>
          </span>
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'routines.builder.addExercise' | transloco: { name: exercise.name }"
            (click)="picked.emit(exercise)"
          >
            <mat-icon>add_circle</mat-icon>
          </button>
        </li>
      } @empty {
        @if (!state().loading) {
          <li class="empty">{{ 'exercises.empty' | transloco }}</li>
        }
      }
    </ul>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    }
    .results {
      flex: 1;
      overflow-y: auto;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 4px 6px 8px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .text {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
    }
    .name {
      font: var(--mat-sys-body-medium);
    }
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .empty {
      justify-content: center;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ExercisePicker {
  private readonly api = inject(ExercisesService);

  protected readonly muscles = MUSCLES;
  protected readonly query = signal('');
  protected readonly muscle = signal<Muscle | null>(null);
  readonly picked = output<ExerciseSummaryDto>();

  protected readonly state = toSignal(
    combineLatest([
      toObservable(this.query).pipe(debounceTime(PICKER_DEBOUNCE_MS), distinctUntilChanged()),
      toObservable(this.muscle),
    ]).pipe(
      // switchMap: typing fast never shows results of an older query.
      switchMap(([q, muscle]) =>
        from(
          this.api.exercisesControllerList({
            ...(q.trim() && { q: q.trim() }),
            ...(muscle && { muscle }),
            sort: q.trim() ? 'relevance' : 'name',
            page: 1,
            limit: PICKER_PAGE,
          }),
        ).pipe(
          map((page): PickerState => ({ loading: false, items: page.items })),
          catchError(() => of<PickerState>({ loading: false, items: [] })),
          startWith<PickerState>({ loading: true, items: [] }),
        ),
      ),
    ),
    { initialValue: { loading: true, items: [] } as PickerState },
  );
}
