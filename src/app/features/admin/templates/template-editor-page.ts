import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AdminProgramTemplateDto } from '../../../api/models/admin-program-template-dto';
import { TargetSetDto } from '../../../api/models/target-set-dto';
import { AdminExercisesService } from '../../../api/services/admin-exercises.service';
import { AdminProgramsService } from '../../../api/services/admin-programs.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/languages';
import { Notifier } from '../../../core/notify/notifier';
import { orderedWeekdays } from '../../../shared/format/local-dates';
import { slugify } from '../../../shared/forms/slug';
import { Translatable, localizeText } from '../../../shared/i18n/translatable';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { GlobalExercisePicker, PickedGlobalExercise } from './global-exercise-picker';
import {
  SET_TYPES,
  TEMPLATE_GOALS,
  TEMPLATE_LEVELS,
  TEMPLATE_LIMITS,
  TemplateFormModel,
  TemplateProblem,
  addRoutine,
  copyFirstWeek,
  moveItem,
  newSet,
  removeRoutine,
  renameRoutineKey,
  resizeWeeks,
  setDay,
  templateProblems,
  toCreateTemplateDto,
  toTemplateForm,
  toUpdateTemplateDto,
  updateExercise,
  updateRoutine,
} from './template-form';

/**
 * Global program templates (PPL, Upper/Lower…): routines by exercise slug + a week × day
 * schedule + deload. The model is edited immutably through `template-form.ts`; `problems()`
 * mirrors what the API would reject so the admin sees it before saving.
 */
@Component({
  selector: 'app-template-editor-page',
  imports: [
    GlobalExercisePicker,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    TranslatableField,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Full page outside the admin tabs: same page container as the shell.
  host: { class: 'page' },
  templateUrl: './template-editor-page.html',
  styleUrl: './template-editor-page.scss',
})
export class TemplateEditorPage implements OnInit {
  private readonly api = inject(AdminProgramsService);
  private readonly exercisesApi = inject(AdminExercisesService);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly id = input<string>();
  protected readonly isNew = computed(() => !this.id());

  protected readonly goals = TEMPLATE_GOALS;
  protected readonly levels = TEMPLATE_LEVELS;
  protected readonly setTypes = SET_TYPES;
  protected readonly limits = TEMPLATE_LIMITS;
  protected readonly weekdays = orderedWeekdays(
    inject(AuthStore).user()?.preferences.firstDayOfWeek ?? 1,
  );

  protected readonly model = signal<TemplateFormModel>(toTemplateForm(null, () => ''));
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  private slugTouched = false;

  protected readonly problems = computed(() => templateProblems(this.model(), this.isNew()));
  protected readonly weekNumbers = computed(() =>
    Array.from({ length: this.model().durationWeeks }, (_, i) => i + 1),
  );

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    try {
      const [template, names] = await Promise.all([
        this.api.adminProgramTemplatesControllerFindOne({ id }),
        this.exerciseNames(),
      ]);
      this.slugTouched = true;
      this.model.set(toTemplateForm(template, (slug) => names.get(slug) ?? ''));
    } catch {
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  // ---------- Meta ----------

  protected patch(patch: Partial<TemplateFormModel>): void {
    this.model.update((m) => ({ ...m, ...patch }));
  }

  /** Until the admin types a slug, it follows the default-language name. */
  protected setName(name: Translatable): void {
    this.model.update((m) => {
      const slug =
        this.isNew() && !this.slugTouched ? slugify(name[DEFAULT_LANGUAGE] ?? '', 80) : m.slug;
      return { ...m, name, slug };
    });
  }

  protected setSlug(slug: string): void {
    this.slugTouched = true;
    this.patch({ slug });
  }

  protected setDuration(weeks: number): void {
    if (Number.isFinite(weeks)) this.model.update((m) => resizeWeeks(m, weeks));
  }

  // ---------- Routines ----------

  protected addRoutine(): void {
    this.model.update(addRoutine);
  }

  protected removeRoutine(index: number): void {
    this.model.update((m) => removeRoutine(m, index));
  }

  protected setRoutineKey(index: number, key: string): void {
    this.model.update((m) => renameRoutineKey(m, index, key.trim()));
  }

  protected setRoutineName(index: number, name: Translatable): void {
    this.model.update((m) => updateRoutine(m, index, (r) => ({ ...r, name })));
  }

  protected addExercise(index: number, picked: PickedGlobalExercise): void {
    this.model.update((m) =>
      updateRoutine(m, index, (r) => ({
        ...r,
        exercises: [
          ...r.exercises,
          {
            exerciseSlug: picked.slug,
            exerciseName: picked.name,
            notes: '',
            groupId: null,
            sets: [newSet(), newSet(), newSet()],
            progression: null,
          },
        ],
      })),
    );
  }

  protected moveExercise(routine: number, from: number, to: number): void {
    this.model.update((m) =>
      updateRoutine(m, routine, (r) => ({ ...r, exercises: moveItem(r.exercises, from, to) })),
    );
  }

  protected removeExercise(routine: number, index: number): void {
    this.model.update((m) =>
      updateRoutine(m, routine, (r) => ({
        ...r,
        exercises: r.exercises.filter((_, i) => i !== index),
      })),
    );
  }

  protected setNotes(routine: number, exercise: number, notes: string): void {
    this.model.update((m) =>
      updateRoutine(m, routine, (r) => updateExercise(r, exercise, (e) => ({ ...e, notes }))),
    );
  }

  protected addSet(routine: number, exercise: number): void {
    this.model.update((m) =>
      updateRoutine(m, routine, (r) =>
        updateExercise(r, exercise, (e) => ({
          ...e,
          // A new set copies the last one: series are usually alike.
          sets: [...e.sets, { ...(e.sets.at(-1) ?? newSet()) }],
        })),
      ),
    );
  }

  protected removeSet(routine: number, exercise: number, set: number): void {
    this.model.update((m) =>
      updateRoutine(m, routine, (r) =>
        updateExercise(r, exercise, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== set) })),
      ),
    );
  }

  protected setSet(routine: number, exercise: number, set: number, patch: Partial<TargetSetDto>) {
    this.model.update((m) =>
      updateRoutine(m, routine, (r) =>
        updateExercise(r, exercise, (e) => ({
          ...e,
          sets: e.sets.map((s, i) => (i === set ? { ...s, ...patch } : s)),
        })),
      ),
    );
  }

  /** Number inputs: empty → undefined (optional fields) / NaN guard. */
  protected num(value: string): number | undefined {
    if (value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  // ---------- Schedule & deload ----------

  protected setDay(week: number, weekday: number, key: string | null): void {
    this.model.update((m) => setDay(m, week, weekday, key));
  }

  protected copyFirstWeek(): void {
    this.model.update(copyFirstWeek);
  }

  protected routineLabel(key: string): string {
    const routine = this.model().routines.find((r) => r.key === key);
    return localizeText(routine?.name, this.transloco.getActiveLang()) || key;
  }

  // ---------- Save ----------

  protected problemText(p: TemplateProblem): string {
    const params = {
      routine: 'routine' in p ? p.routine + 1 : '',
      exercise: 'exercise' in p ? p.exercise + 1 : '',
      key: 'key' in p ? p.key : '',
    };
    return this.transloco.translate(`admin.templates.problems.${p.kind}`, params);
  }

  protected async save(): Promise<void> {
    if (this.problems().length) return;
    this.saving.set(true);
    try {
      const model = this.model();
      const id = this.id();
      let saved: AdminProgramTemplateDto;
      if (id) {
        saved = await this.api.adminProgramTemplatesControllerUpdate({
          id,
          body: toUpdateTemplateDto(model),
        });
      } else {
        saved = await this.api.adminProgramTemplatesControllerCreate({
          body: toCreateTemplateDto(model),
        });
        await this.router.navigate(['/admin/templates', saved.id], { replaceUrl: true });
      }
      this.notifier.info('common.saved');
    } catch {
      // VALIDATION_ERROR / EXERCISE_NOT_FOUND / slug taken: already shown by the snackbar.
    } finally {
      this.saving.set(false);
    }
  }

  /** Templates store slugs: resolve names from the global catalog once (~120 exercises). */
  private async exerciseNames(): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const lang = this.transloco.getActiveLang();
    try {
      for (let page = 1; ; page++) {
        const result = await this.exercisesApi.adminExercisesControllerList({
          custom: false,
          sort: 'name',
          page,
          limit: 100,
        });
        for (const ex of result.items) {
          if (ex.slug) names.set(ex.slug, localizeText(ex.name, lang));
        }
        if (page * 100 >= result.meta.total || !result.items.length) break;
      }
    } catch {
      // Rows show the slug instead.
    }
    return names;
  }
}
