import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslocoPipe } from '@jsverse/transloco';
import { RoutineDetailDto } from '../../api/models/routine-detail-dto';
import { UnitSystem } from '../../shared/units/units';
import { ProgressionEditor } from '../routines/progression-editor';
import {
  addProgressionWeek,
  fromRoutineDetail,
  referenceMaxNeedsOf,
  removeProgressionWeek,
  toRoutineDto,
} from '../routines/routine-draft';
import { routineSchema } from '../routines/routine-schema';
import { RoutineRulesChange } from './program-wizard.store';

export interface ReferenceMaxNeed {
  exerciseId: string;
  name: string;
}

/**
 * Progression rules of one scheduled routine, edited from the program wizard. Rules live
 * in the routine (the API stores them per routine exercise), so saving PATCHes the routine.
 */
@Component({
  selector: 'app-routine-rules-panel',
  imports: [MatExpansionModule, ProgressionEditor, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-expansion-panel>
      <mat-expansion-panel-header>
        <mat-panel-title>{{ routine().name }}</mat-panel-title>
        <mat-panel-description>
          {{ 'programs.wizard.rulesCount' | transloco: { count: ruleCount() } }}
        </mat-panel-description>
      </mat-expansion-panel-header>
      <ol class="items">
        @for (item of rulesForm.items; track item().value().id; let i = $index) {
          <li>
            <h4>
              {{
                item().value().exercise?.name ?? ('routines.builder.missingExercise' | transloco)
              }}
            </h4>
            <app-progression-editor
              [rule]="item.progression"
              [units]="units()"
              (weekAdded)="addWeek(i)"
              (weekRemoved)="removeWeek(i, $event)"
            />
          </li>
        }
      </ol>
    </mat-expansion-panel>
  `,
  styles: `
    .items {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      padding-bottom: 12px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    h4 {
      margin: 0 0 8px;
      font: var(--mat-sys-title-small);
    }
  `,
})
export class RoutineRulesPanel {
  readonly routine = input.required<RoutineDetailDto>();
  readonly units = input.required<UnitSystem>();

  /** Re-derived when the routine is (re)loaded, e.g. after the wizard saves it. */
  private readonly draft = linkedSignal(() => fromRoutineDetail(this.routine(), this.units()));
  private readonly original = computed(() =>
    JSON.stringify(fromRoutineDetail(this.routine(), this.units())),
  );
  protected readonly rulesForm = form(
    this.draft,
    routineSchema(() => this.units()),
  );

  protected readonly ruleCount = computed(
    () => this.draft().items.filter((i) => i.progression.kind !== 'none').length,
  );

  readonly dirty = computed(() => JSON.stringify(this.draft()) !== this.original());
  readonly valid = computed(() => this.rulesForm().valid());

  /** Exercises whose targets are a % of a max (rules or %1RM sets), as edited now. */
  readonly referenceMaxNeeds = computed<ReferenceMaxNeed[]>(() =>
    referenceMaxNeedsOf(this.draft()),
  );

  /** The PATCH for this routine, or null when nothing changed. */
  change(): RoutineRulesChange | null {
    if (!this.dirty()) return null;
    return { routineId: this.routine().id, body: toRoutineDto(this.draft(), this.units()) };
  }

  /** Marks every field touched so the errors show. */
  touchAll(): void {
    this.rulesForm().markAsTouched();
  }

  protected addWeek(index: number): void {
    this.draft.update((d) => addProgressionWeek(d, index));
  }

  protected removeWeek(index: number, weekIndex: number): void {
    this.draft.update((d) => removeProgressionWeek(d, index, weekIndex));
  }
}
