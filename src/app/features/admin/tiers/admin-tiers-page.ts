import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminExerciseDto } from '../../../api/models/admin-exercise-dto';
import { AdminExercisesService } from '../../../api/services/admin-exercises.service';
import { Notifier } from '../../../core/notify/notifier';
import {
  MUSCLES,
  Muscle,
  TIERS,
  TIER_GOALS,
  Tier,
  TierGoal,
} from '../../../shared/exercises/exercise-taxonomy';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { TierChanges, changeCount, setTierChange, tierOf, toBulkItems } from './tier-changes';

/** The API's page cap: one muscle group fits in a page. */
const PAGE_LIMIT = 100;

/**
 * Bulk tier assignment: pick a goal and a muscle group, set S/A/B/C per row, save all the
 * changes in one request. Nothing is sent until "Save".
 */
@Component({
  selector: 'app-admin-tiers-page',
  imports: [
    LocalizedPipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <mat-button-toggle-group
        hideSingleSelectionIndicator
        [value]="goal()"
        [attr.aria-label]="'exercises.filters.goal' | transloco"
        (change)="goal.set($event.value)"
      >
        @for (g of goals; track g) {
          <mat-button-toggle [value]="g">{{ 'profile.goal.' + g | transloco }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'exercises.filters.muscle' | transloco }}</mat-label>
        <mat-select [value]="muscle()" (valueChange)="setMuscle($event)">
          @for (m of muscles; track m) {
            <mat-option [value]="m">{{ 'exercises.muscles.' + m | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <span class="spacer"></span>
      <button mat-button type="button" [disabled]="!count() || saving()" (click)="discard()">
        {{ 'admin.tiers.discard' | transloco }}
      </button>
      <button mat-flat-button type="button" [disabled]="!count() || saving()" (click)="save()">
        {{ 'admin.tiers.save' | transloco: { count: count() } }}
      </button>
    </div>
    <p class="hint">{{ 'admin.tiers.hint' | transloco }}</p>

    <mat-card appearance="outlined" class="card">
      <div class="scroll" [class.pending]="pending()">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.tiers' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.fields.name' | transloco }}</th>
              <th scope="col">
                {{
                  'admin.exercises.tierFor'
                    | transloco: { goal: ('profile.goal.' + goal() | transloco) }
                }}
              </th>
            </tr>
          </thead>
          <tbody>
            @for (ex of exercises(); track ex.id) {
              @let current = tier(ex);
              @let name = ex.name | localized;
              <tr [class.changed]="current !== ex.tiers[goal()]">
                <th scope="row">
                  {{ name }}
                  <span class="sub">{{ 'exercises.equipment.' + ex.equipment | transloco }}</span>
                </th>
                <td>
                  <mat-button-toggle-group
                    hideSingleSelectionIndicator
                    [value]="current ?? 'none'"
                    [attr.aria-label]="'admin.tiers.rowLabel' | transloco: { name }"
                    (change)="set(ex, $event.value === 'none' ? null : $event.value)"
                  >
                    @for (t of tiers; track t) {
                      <mat-button-toggle [value]="t">{{ t }}</mat-button-toggle>
                    }
                    <mat-button-toggle
                      value="none"
                      [attr.aria-label]="'admin.tiers.none' | transloco"
                      >—</mat-button-toggle
                    >
                  </mat-button-toggle-group>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="2" class="empty">{{ 'admin.empty' | transloco }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </mat-card>
  `,
  styleUrl: '../admin.scss',
  styles: `
    tr.changed th,
    tr.changed td {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
  `,
})
export class AdminTiersPage {
  private readonly api = inject(AdminExercisesService);
  private readonly notifier = inject(Notifier);

  protected readonly goals = TIER_GOALS;
  protected readonly muscles = MUSCLES;
  protected readonly tiers = TIERS;

  protected readonly goal = signal<TierGoal>('hypertrophy');
  protected readonly muscle = signal<Muscle>('chest');
  protected readonly exercises = signal<AdminExerciseDto[]>([]);
  protected readonly changes = signal<TierChanges>({});
  protected readonly pending = signal(false);
  protected readonly saving = signal(false);
  protected readonly count = computed(() => changeCount(this.changes()));

  constructor() {
    void this.load();
  }

  protected tier(exercise: AdminExerciseDto): Tier | null {
    return tierOf(this.changes(), exercise, this.goal());
  }

  protected set(exercise: AdminExerciseDto, tier: Tier | null): void {
    this.changes.update((c) => setTierChange(c, exercise, this.goal(), tier));
  }

  /** Changes are kept per exercise, so switching the muscle group doesn't lose them. */
  protected setMuscle(muscle: Muscle): void {
    this.muscle.set(muscle);
    void this.load();
  }

  protected discard(): void {
    this.changes.set({});
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      const result = await this.api.adminExercisesControllerBulkTiers({
        body: { items: toBulkItems(this.changes()) },
      });
      this.notifier.info('admin.tiers.saved', { count: result.updated });
      this.changes.set({});
      await this.load();
    } catch {
      // errorInterceptor already reported it; the changes stay to retry.
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.pending.set(true);
    try {
      const page = await this.api.adminExercisesControllerList({
        muscle: this.muscle(),
        custom: false,
        sort: 'name',
        page: 1,
        limit: PAGE_LIMIT,
      });
      this.exercises.set(page.items);
    } catch {
      // errorInterceptor already reported it.
    } finally {
      this.pending.set(false);
    }
  }
}
