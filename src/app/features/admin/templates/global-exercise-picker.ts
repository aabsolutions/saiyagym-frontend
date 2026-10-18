import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { AdminExerciseDto } from '../../../api/models/admin-exercise-dto';
import { AdminExercisesService } from '../../../api/services/admin-exercises.service';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { localizeText } from '../../../shared/i18n/translatable';

export interface PickedGlobalExercise {
  slug: string;
  name: string;
}

/** Search the global catalog; templates reference exercises by slug. */
@Component({
  selector: 'app-global-exercise-picker',
  imports: [
    LocalizedPipe,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="full-width" subscriptSizing="dynamic">
      <mat-label>{{ labelKey() | transloco }}</mat-label>
      <mat-icon matPrefix aria-hidden="true">search</mat-icon>
      <input
        matInput
        [value]="query()"
        [matAutocomplete]="auto"
        (input)="query.set($any($event.target).value)"
      />
      <mat-autocomplete #auto [displayWith]="blank" (optionSelected)="pick($event.option.value)">
        @for (ex of results(); track ex.id) {
          @if (ex.slug) {
            <mat-option [value]="ex">
              {{ ex.name | localized }}
              <small class="muted"
                >· {{ 'exercises.muscles.' + ex.primaryMuscle | transloco }}</small
              >
            </mat-option>
          }
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: `
    .muted {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class GlobalExercisePicker {
  private readonly api = inject(AdminExercisesService);
  private readonly transloco = inject(TranslocoService);

  readonly labelKey = input('admin.templates.addExercise');
  readonly picked = output<PickedGlobalExercise>();

  /** The picked option clears the box (it is added to the list below, not kept as text). */
  protected readonly blank = () => '';
  protected readonly query = signal('');
  protected readonly results = toSignal(
    toObservable(this.query).pipe(
      map((q) => (typeof q === 'string' ? q.trim() : '')),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) =>
        q.length < 2
          ? of<AdminExerciseDto[]>([])
          : from(
              this.api.adminExercisesControllerList({
                q,
                custom: false,
                sort: 'relevance',
                page: 1,
                limit: 10,
              }),
            ).pipe(
              map((page) => page.items),
              catchError(() => of<AdminExerciseDto[]>([])),
            ),
      ),
    ),
    { initialValue: [] },
  );

  protected pick(exercise: AdminExerciseDto): void {
    this.query.set('');
    if (!exercise.slug) return;
    this.picked.emit({
      slug: exercise.slug,
      name: localizeText(exercise.name, this.transloco.getActiveLang()),
    });
  }
}
