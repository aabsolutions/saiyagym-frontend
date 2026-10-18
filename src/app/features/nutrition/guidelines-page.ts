import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslocoPipe } from '@jsverse/transloco';
import { NUTRITION_GOALS, NutritionGoal } from './nutrition-model';
import { NutritionStore } from './nutrition.store';

/** Short articles per goal (daily protein, hydration, timing). Free for everyone. */
@Component({
  selector: 'app-guidelines-page',
  imports: [MatChipsModule, MatExpansionModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-chip-listbox
      class="chips"
      [attr.aria-label]="'nutrition.guidelines.goal' | transloco"
      [value]="store.guidelineGoal()"
      (change)="setGoal($event.value ?? null)"
    >
      <mat-chip-option [value]="null" [selected]="store.guidelineGoal() === null">{{
        'nutrition.all' | transloco
      }}</mat-chip-option>
      @for (goal of goals; track goal) {
        <mat-chip-option [value]="goal">{{
          'nutrition.goals.' + goal | transloco
        }}</mat-chip-option>
      }
    </mat-chip-listbox>

    @if (store.guidelines(); as list) {
      <div class="list" [class.pending]="store.guidelinesPending()">
        @for (g of list.items; track g.id) {
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>{{ g.title }}</mat-panel-title>
            </mat-expansion-panel-header>
            <p class="description">{{ g.summary }}</p>
            <!-- Plain text (admin content): newlines become paragraphs, never raw HTML. -->
            @for (paragraph of paragraphs(g.body); track $index) {
              <p>{{ paragraph }}</p>
            }
            <mat-chip-set>
              @for (goal of g.goals; track goal) {
                <mat-chip>{{ 'nutrition.goals.' + goal | transloco }}</mat-chip>
              }
            </mat-chip-set>
          </mat-expansion-panel>
        } @empty {
          <p class="empty">{{ 'nutrition.guidelines.empty' | transloco }}</p>
        }
      </div>
      <p class="disclaimer">{{ list.disclaimer }}</p>
    } @else {
      <p class="empty">{{ 'common.loading' | transloco }}</p>
    }
  `,
  styleUrl: './nutrition-page.scss',
})
export class GuidelinesPage {
  protected readonly store = inject(NutritionStore);
  protected readonly goals = NUTRITION_GOALS;

  constructor() {
    this.store.activate('guidelines');
  }

  protected setGoal(goal: NutritionGoal | null): void {
    this.store.setGuidelineGoal(goal);
  }

  protected paragraphs(body: string): string[] {
    return body
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
}
