import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { map } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { orderedWeekdays, todayIso } from '../../shared/format/local-dates';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { RequireFeatureDirective } from '../../shared/plans/require-feature.directive';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { HasUnsavedChanges } from '../../shared/ui/unsaved-changes.guard';
import {
  ProgramDraft,
  copyWeekToAll,
  emptyProgram,
  fromProgramDto,
  resizeWeeks,
  scheduledRoutineIds,
  setCell,
  syncTrainingMaxes,
  toProgramDto,
  toggleDeloadWeek,
  trainingDayCount,
} from './program-draft';
import { fromRoutineDetail, referenceMaxNeedsOf } from '../routines/routine-draft';
import { programSchema } from './program-schema';
import { ProgramWizardStore } from './program-wizard.store';
import { ProgramsStore } from './programs.store';
import { RoutineRulesPanel } from './routine-rules-panel';

@Component({
  selector: 'app-program-wizard-page',
  imports: [
    FormField,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatStepperModule,
    RequireFeatureDirective,
    RouterLink,
    RoutineRulesPanel,
    TranslocoPipe,
    UpgradeCta,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './program-wizard-page.html',
  styleUrl: './program-wizard-page.scss',
})
export class ProgramWizardPage implements OnInit, HasUnsavedChanges {
  protected readonly store = inject(ProgramWizardStore);
  private readonly programs = inject(ProgramsStore);
  private readonly auth = inject(AuthStore);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);

  /** Route param; absent on /programs/new. */
  readonly id = input<string>();

  /** Pinned for the editing session (training maxes are typed in this unit). */
  protected readonly units = inject(PreferencesStore).units();
  protected readonly weekdays = orderedWeekdays(this.auth.user()?.preferences.firstDayOfWeek ?? 1);

  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.XSmall)
      .pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly draft = signal<ProgramDraft>(emptyProgram());
  /** What the API has, as the body we would send: empty max rows etc. are not "changes". */
  private readonly saved = signal(this.bodyOf(emptyProgram()));
  protected readonly programForm = form(
    this.draft,
    programSchema(() => this.units),
  );

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly startDate = signal(todayIso());

  private readonly rulePanels = viewChildren(RoutineRulesPanel);

  protected readonly routineName = computed(() => {
    const names = new Map(this.store.routines().map((r) => [r.id, r.name]));
    return (id: string | null) => (id ? (names.get(id) ?? null) : null);
  });

  protected readonly scheduled = computed(() =>
    scheduledRoutineIds(this.draft())
      .map((id) => this.store.details()[id])
      .filter((r) => !!r),
  );

  protected readonly trainingDays = computed(() => trainingDayCount(this.draft()));
  protected readonly weeks = computed(() =>
    Array.from({ length: this.draft().durationWeeks }, (_, i) => i + 1),
  );

  protected readonly rulesDirty = computed(() => this.rulePanels().some((p) => p.dirty()));
  protected readonly dirty = computed(
    () => this.bodyOf(this.draft()) !== this.saved() || this.rulesDirty(),
  );
  /** Only drafts (and new programs) can be activated from here. */
  protected readonly canActivate = computed(
    () => (this.store.program()?.status ?? 'draft') === 'draft',
  );

  /**
   * Exercises that need a reference max: from the stored routines (also for Free users, who
   * have %1RM sets but no rule panels) plus whatever is being edited in the panels.
   */
  protected readonly maxNeeds = computed(() => {
    const seen = new Map<string, string>();
    for (const routine of this.scheduled())
      for (const need of referenceMaxNeedsOf(fromRoutineDetail(routine, this.units)))
        seen.set(need.exerciseId, need.name);
    for (const panel of this.rulePanels())
      for (const need of panel.referenceMaxNeeds()) seen.set(need.exerciseId, need.name);
    return [...seen].map(([exerciseId, name]) => ({ exerciseId, name }));
  });

  constructor() {
    // One training-max row per exercise that needs it (rows keep what was typed).
    effect(() => {
      const ids = this.maxNeeds().map((n) => n.exerciseId);
      untracked(() => this.draft.update((d) => syncTrainingMaxes(d, ids)));
    });
  }

  async ngOnInit(): Promise<void> {
    const program = await this.store.load(this.id() ?? null);
    this.loading.set(false);
    if (this.id() && !program) {
      this.notFound.set(true);
      return;
    }
    if (program) {
      const draft = fromProgramDto(program, this.units);
      this.draft.set(draft);
      this.saved.set(this.bodyOf(draft));
      if (program.startDate) this.startDate.set(program.startDate);
      void this.store.loadDetails(scheduledRoutineIds(draft));
    }
  }

  private bodyOf(draft: ProgramDraft): string {
    return JSON.stringify(toProgramDto(draft, this.units));
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  protected setWeeks(value: string): void {
    this.draft.update((d) => resizeWeeks(d, Number(value)));
  }

  protected setCell(week: number, weekday: number, routineId: string | null): void {
    this.draft.update((d) => setCell(d, week, weekday, routineId));
  }

  protected copyWeek(week: number): void {
    this.draft.update((d) => copyWeekToAll(d, week));
  }

  protected toggleDeload(week: number): void {
    this.draft.update((d) => toggleDeloadWeek(d, week));
  }

  /** Entering the progression/review steps: load routines scheduled since the last visit. */
  protected onStep(index: number): void {
    if (index >= 3) void this.store.loadDetails(scheduledRoutineIds(this.draft()));
  }

  protected maxIndex(exerciseId: string): number {
    return this.draft().trainingMaxes.findIndex((tm) => tm.exerciseId === exerciseId);
  }

  protected async save(activate: boolean): Promise<void> {
    this.programForm().markAsTouched();
    this.rulePanels().forEach((p) => p.touchAll());
    const panelsValid = this.rulePanels().every((p) => p.valid());
    if (!this.programForm().valid() || !panelsValid) {
      this.notifier.info('programs.wizard.invalid');
      return;
    }
    const rules = this.rulePanels()
      .map((p) => p.change())
      .filter((c) => c !== null);
    const saved = await this.store.save(
      toProgramDto(this.draft(), this.units),
      rules,
      activate ? this.startDate() : null,
    );
    if (!saved) return;

    const draft = fromProgramDto(saved, this.units);
    this.draft.set(
      syncTrainingMaxes(
        draft,
        this.maxNeeds().map((n) => n.exerciseId),
      ),
    );
    this.saved.set(this.bodyOf(draft));
    this.notifier.info(saved.status === 'active' ? 'programs.list.activated' : 'common.saved');
    void this.programs.load();
    if (saved.status === 'active') await this.router.navigateByUrl('/programs/week');
    else if (!this.id())
      await this.router.navigate(['/programs', saved.id, 'edit'], { replaceUrl: true });
  }
}
