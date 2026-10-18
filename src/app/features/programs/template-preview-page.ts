import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { CopyProgramTemplateDto } from '../../api/models/copy-program-template-dto';
import { TargetSetDto } from '../../api/models/target-set-dto';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';
import { orderedWeekdays } from '../../shared/format/local-dates';
import { ProgramsStore } from './programs.store';
import { TemplatesStore, templateMaxNeeds } from './templates.store';
import { UseTemplateData, UseTemplateDialog } from './use-template-dialog';

@Component({
  selector: 'app-template-preview-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-preview-page.html',
  styleUrl: './template-preview-page.scss',
})
export class TemplatePreviewPage {
  protected readonly store = inject(TemplatesStore);
  private readonly programs = inject(ProgramsStore);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly weekdays = orderedWeekdays(
    inject(AuthStore).user()?.preferences.firstDayOfWeek ?? 1,
  );

  protected readonly routineNames = computed(
    () => new Map(this.store.detail()?.routines.map((r) => [r.key, r.name]) ?? []),
  );

  constructor() {
    effect(() => void this.store.loadDetail(this.id()));
  }

  /** "3 × 8–12" style summary of a template exercise's working sets. */
  protected setsSummary(sets: TargetSetDto[]): { count: number; reps: string } {
    const working = sets.filter((s) => s.type !== 'warmup');
    const first = working[0] ?? sets[0];
    const reps = first
      ? first.repsMin === first.repsMax
        ? `${first.repsMin}`
        : `${first.repsMin}–${first.repsMax}`
      : '';
    return { count: working.length, reps };
  }

  protected routineOn(week: { days: { weekday: number; routineKey: string }[] }, weekday: number) {
    const key = week.days.find((d) => d.weekday === weekday)?.routineKey;
    return key ? (this.routineNames().get(key) ?? null) : null;
  }

  protected async use(): Promise<void> {
    const template = this.store.detail();
    if (!template) return;
    const data: UseTemplateData = {
      name: template.name,
      usesAutoProgression: template.usesAutoProgression,
      maxNeeds: templateMaxNeeds(template),
    };
    const body = await firstValueFrom(
      this.dialog
        .open<UseTemplateDialog, UseTemplateData, CopyProgramTemplateDto>(UseTemplateDialog, {
          data,
          maxWidth: '520px',
          width: '100%',
        })
        .afterClosed(),
    );
    if (!body) return;

    const result = await this.store.copy(template.id, body);
    if (!result) return;
    if (result.progressionRulesDropped) this.notifier.info('programs.templates.copiedWithoutRules');
    else if (result.skippedExercises.length)
      this.notifier.info('programs.templates.copiedSkipped', {
        count: result.skippedExercises.length,
      });
    else this.notifier.info('programs.templates.copied');
    void this.programs.load();
    await this.router.navigate(['/programs', result.program.id, 'edit']);
  }
}
