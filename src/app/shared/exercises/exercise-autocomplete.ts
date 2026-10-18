import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { ExercisesService } from '../../api/services/exercises.service';
import { PICKER_DEBOUNCE_MS } from './exercise-picker';

export interface PickedExercise {
  id: string;
  name: string;
}

/** Search-as-you-type exercise field (filters). Emits the pick, or null when cleared. */
@Component({
  selector: 'app-exercise-autocomplete',
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="full-width" subscriptSizing="dynamic">
      <mat-label>{{ label() | transloco }}</mat-label>
      <input
        matInput
        type="search"
        maxlength="100"
        [value]="selected()?.name ?? query()"
        [matAutocomplete]="auto"
        (input)="onType($any($event.target).value)"
      />
      @if (selected() || query()) {
        <button
          mat-icon-button
          matSuffix
          type="button"
          [attr.aria-label]="'exercises.clearSearch' | transloco"
          (click)="clear()"
        >
          <mat-icon>close</mat-icon>
        </button>
      }
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="pick($event.option.value)">
        @for (exercise of options(); track exercise.id) {
          <mat-option [value]="exercise">{{ exercise.name }}</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class ExerciseAutocomplete {
  private readonly api = inject(ExercisesService);

  readonly label = input('exercises.filters.exercise');
  /** The current selection (e.g. restored from the URL). */
  readonly selected = input<PickedExercise | null>(null);
  readonly picked = output<PickedExercise | null>();

  protected readonly query = signal('');

  protected readonly options = toSignal(
    toObservable(this.query).pipe(
      debounceTime(PICKER_DEBOUNCE_MS),
      map((q) => q.trim()),
      distinctUntilChanged(),
      switchMap((q) =>
        q.length < 2
          ? of<ExerciseSummaryDto[]>([])
          : from(
              this.api.exercisesControllerList({ q, sort: 'relevance', page: 1, limit: 10 }),
            ).pipe(
              map((page) => page.items),
              catchError(() => of<ExerciseSummaryDto[]>([])),
            ),
      ),
    ),
    { initialValue: [] as ExerciseSummaryDto[] },
  );

  protected onType(value: string): void {
    // Typing over a selection means a new search: drop the current filter.
    if (this.selected()) this.picked.emit(null);
    this.query.set(value);
  }

  protected pick(exercise: ExerciseSummaryDto): void {
    this.query.set('');
    this.picked.emit({ id: exercise.id, name: exercise.name });
  }

  protected clear(): void {
    this.query.set('');
    this.picked.emit(null);
  }
}
