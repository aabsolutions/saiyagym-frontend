import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { WorkoutExerciseResponseDto } from '../../api/models/workout-exercise-response-dto';
import { Notifier } from '../../core/notify/notifier';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { DurationPipe } from '../../shared/format/duration.pipe';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { epley, isWorkingSet } from '../../shared/training/set-math';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { RatingStars } from '../../shared/ui/rating-stars';
import { HasUnsavedChanges } from '../../shared/ui/unsaved-changes.guard';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { SET_TYPES } from '../routines/routine-draft';
import { HistoryStore } from './history.store';
import { SessionRecord, WorkoutDetailStore } from './workout-detail.store';
import {
  WorkoutDraft,
  draftVolumeKg,
  fromWorkoutDetail,
  removeWorkoutSet,
  toUpdateWorkoutDto,
  workoutSchema,
} from './workout-draft';

const EMPTY: WorkoutDraft = { name: '', notes: '', rating: null, exercises: [] };

@Component({
  selector: 'app-workout-detail-page',
  imports: [
    DurationPipe,
    FormField,
    FormRoot,
    LocalDatePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RatingStars,
    RouterLink,
    TranslocoPipe,
    ValidationMessagePipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workout-detail-page.html',
  styleUrl: './workout-detail-page.scss',
})
export class WorkoutDetailPage implements HasUnsavedChanges {
  protected readonly store = inject(WorkoutDetailStore);
  private readonly history = inject(HistoryStore);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  private readonly prefs = inject(PreferencesStore);

  /** Route param. */
  readonly id = input.required<string>();

  protected readonly setTypes = SET_TYPES;
  protected readonly editing = signal(false);
  /** Pinned when editing starts: weights are typed in this unit. */
  protected readonly units = signal(this.prefs.units());

  protected readonly draft = signal<WorkoutDraft>(EMPTY);
  private readonly saved = signal(JSON.stringify(EMPTY));
  protected readonly editForm = form(
    this.draft,
    workoutSchema(() => this.units()),
    {
      submission: {
        action: async (field) => {
          const newRecords = await this.store.save(
            toUpdateWorkoutDto(field().value(), this.units()),
          );
          if (newRecords === null) return undefined;
          this.editing.set(false);
          this.notifier.info(
            newRecords.length ? 'history.detail.savedWithRecords' : 'common.saved',
            { count: newRecords.length },
          );
          void this.history.refresh();
          return undefined;
        },
      },
    },
  );

  protected readonly dirty = computed(
    () => this.editing() && JSON.stringify(this.draft()) !== this.saved(),
  );
  protected readonly liveVolume = computed(() => draftVolumeKg(this.draft(), this.units()));
  /** Sessions still being logged on the phone are read-only here (sync would fight it). */
  protected readonly editable = computed(() => !!this.store.workout()?.finishedAt);

  protected readonly recordsByExercise = computed(() => {
    const map = new Map<string, SessionRecord[]>();
    for (const r of this.store.records())
      map.set(r.exerciseId, [...(map.get(r.exerciseId) ?? []), r]);
    return map;
  });

  constructor() {
    effect(() => void this.store.load(this.id()));
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  protected startEditing(): void {
    const workout = this.store.workout();
    if (!workout) return;
    this.units.set(this.prefs.units());
    const draft = fromWorkoutDetail(workout, this.units());
    this.draft.set(draft);
    this.saved.set(JSON.stringify(draft));
    this.editing.set(true);
  }

  protected async cancelEditing(): Promise<void> {
    if (this.dirty()) {
      const discard = await firstValueFrom(
        this.dialog
          .open(ConfirmDialog, {
            data: {
              title: 'common.unsaved.title',
              message: 'common.unsaved.message',
              confirm: 'history.detail.discard',
              danger: true,
            },
          })
          .afterClosed(),
      );
      if (discard !== true) return;
    }
    this.editing.set(false);
  }

  protected removeSet(exercise: number, set: number): void {
    this.draft.update((d) => removeWorkoutSet(d, exercise, set));
  }

  protected setRating(rating: number | null): void {
    this.draft.update((d) => ({ ...d, rating }));
  }

  protected async remove(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          data: {
            title: 'history.detail.deleteTitle',
            message: 'history.detail.deleteMessage',
            confirm: 'history.detail.delete',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (confirmed !== true || !(await this.store.remove())) return;
    this.notifier.info('history.detail.deleted');
    void this.history.refresh();
    await this.router.navigateByUrl('/history');
  }

  /** Best estimated 1RM among the exercise's working sets (Epley, 1–12 reps). */
  protected bestE1RM(exercise: WorkoutExerciseResponseDto): number | null {
    const values = exercise.sets
      .filter((s) => s.completed && isWorkingSet(s.type))
      .map((s) => epley(s.weightKg, s.reps))
      .filter((v): v is number => v !== null);
    return values.length ? Math.max(...values) : null;
  }
}
