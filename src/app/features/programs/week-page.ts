import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlannedSetDto } from '../../api/models/planned-set-dto';
import { ProgressionNoteDto } from '../../api/models/progression-note-dto';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { isoWeekday } from '../../shared/format/local-dates';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { ProgramsStore } from './programs.store';
import { WeekStore } from './week.store';

@Component({
  selector: 'app-week-page',
  imports: [
    LocalDatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    RouterLink,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './week-page.html',
  styleUrl: './week-page.scss',
})
export class WeekPage implements OnInit {
  protected readonly week = inject(WeekStore);
  protected readonly programs = inject(ProgramsStore);

  protected readonly program = computed(() =>
    this.programs.active().find((p) => p.id === this.week.programId()),
  );
  /** Same for every day; shown once in the header. */
  protected readonly summary = computed(() => this.week.days()[0] ?? null);

  async ngOnInit(): Promise<void> {
    await this.programs.ensureLoaded();
    // Latest activated first (the API's default too).
    const active = [...this.programs.active()].sort((a, b) =>
      (b.activatedAt ?? '').localeCompare(a.activatedAt ?? ''),
    );
    if (active[0] && !this.week.programId()) await this.week.show(active[0].id);
    else if (this.week.programId()) await this.week.load();
  }

  protected weekday(date: string): number {
    return isoWeekday(date);
  }

  /** "100 kg × 5" groups: consecutive identical sets collapse to "3 × 100 kg × 5". */
  protected groupSets(sets: PlannedSetDto[]) {
    const groups: { count: number; set: PlannedSetDto }[] = [];
    for (const set of sets) {
      const last = groups.at(-1);
      const same =
        last &&
        last.set.type === set.type &&
        last.set.weightKg === set.weightKg &&
        last.set.repsMin === set.repsMin &&
        last.set.repsMax === set.repsMax;
      if (same) last.count++;
      else groups.push({ count: 1, set });
    }
    return groups;
  }

  protected noteParam(note: ProgressionNoteDto, key: string): number | null {
    const value = (note.params as Record<string, unknown> | undefined)?.[key];
    return typeof value === 'number' ? value : null;
  }
}
