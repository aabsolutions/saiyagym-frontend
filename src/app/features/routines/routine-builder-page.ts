import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { ExercisePicker } from '../../shared/exercises/exercise-picker';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { HasUnsavedChanges } from '../../shared/ui/unsaved-changes.guard';
import { RoutineBuilderStore } from './routine-builder.store';
import {
  RoutineDraft,
  addItem,
  addProgressionWeek,
  addSet,
  emptyRoutine,
  fromRoutineDetail,
  linkedWithNext,
  moveItem,
  newItem,
  removeItem,
  removeProgressionWeek,
  removeSet,
  toRoutineDto,
  toggleLinkWithNext,
} from './routine-draft';
import { RoutineItemEditor } from './routine-item-editor';
import { routineSchema } from './routine-schema';

@Component({
  selector: 'app-routine-builder-page',
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDropList,
    ExercisePicker,
    FormField,
    FormRoot,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RouterLink,
    RoutineItemEditor,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-builder-page.html',
  styleUrl: './routine-builder-page.scss',
})
export class RoutineBuilderPage implements OnInit, HasUnsavedChanges {
  protected readonly store = inject(RoutineBuilderStore);
  private readonly auth = inject(AuthStore);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);

  /** Route param; absent on /routines/new. */
  readonly id = input<string>();

  /**
   * Loads are edited in the user's unit. Pinned for the whole editing session: switching
   * kg ↔ lb mid-edit would otherwise reinterpret every number already typed.
   */
  protected readonly units = inject(PreferencesStore).units();
  private readonly defaultRest = this.auth.user()?.preferences.defaultRestSeconds;

  protected readonly draft = signal<RoutineDraft>(emptyRoutine());
  /** The saved state, to detect unsaved changes. */
  private readonly saved = signal(JSON.stringify(emptyRoutine()));
  protected readonly dirty = computed(() => JSON.stringify(this.draft()) !== this.saved());
  protected readonly showPicker = signal(false);
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);

  protected readonly routineForm = form(
    this.draft,
    routineSchema(() => this.units),
    {
      submission: {
        action: async (field) => {
          const saved = await this.store.save(
            this.id() ?? null,
            toRoutineDto(field().value(), this.units),
          );
          if (!saved) return undefined;
          this.notifier.info('common.saved');
          const draft = fromRoutineDetail(saved, this.units);
          this.draft.set(draft);
          this.saved.set(JSON.stringify(draft));
          if (!this.id()) {
            await this.router.navigate(['/routines', saved.id], { replaceUrl: true });
          }
          return undefined;
        },
        onInvalid: () => this.notifier.info('routines.builder.invalid'),
      },
    },
  );

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    const routine = await this.store.load(id);
    this.loading.set(false);
    if (!routine) {
      this.notFound.set(true);
      return;
    }
    const draft = fromRoutineDetail(routine, this.units);
    this.draft.set(draft);
    this.saved.set(JSON.stringify(draft));
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  /** Reload / close tab with unsaved changes: the browser shows its own prompt. */
  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  protected add(exercise: ExerciseSummaryDto): void {
    const { id, name, primaryMuscle, equipment, mechanic, imageUrl } = exercise;
    this.draft.update((d) =>
      addItem(
        d,
        newItem({ id, name, primaryMuscle, equipment, mechanic, imageUrl }, this.defaultRest),
      ),
    );
    this.notifier.info('routines.builder.added', { name });
  }

  protected onDrop(event: CdkDragDrop<unknown>): void {
    this.draft.update((d) => moveItem(d, event.previousIndex, event.currentIndex));
  }

  protected remove(index: number): void {
    this.draft.update((d) => removeItem(d, index));
  }

  protected toggleLink(index: number): void {
    this.draft.update((d) => toggleLinkWithNext(d, index));
  }

  protected addSet(index: number): void {
    this.draft.update((d) => addSet(d, index, this.defaultRest));
  }

  protected removeSet(index: number, setIndex: number): void {
    this.draft.update((d) => removeSet(d, index, setIndex));
  }

  protected addWeek(index: number): void {
    this.draft.update((d) => addProgressionWeek(d, index));
  }

  protected removeWeek(index: number, weekIndex: number): void {
    this.draft.update((d) => removeProgressionWeek(d, index, weekIndex));
  }

  protected linked(index: number): boolean {
    return linkedWithNext(this.draft().items, index);
  }
}
