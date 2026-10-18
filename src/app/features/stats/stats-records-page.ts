import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { StatsStore } from './stats.store';

/** Every record type per exercise, with the date it was set. */
@Component({
  selector: 'app-stats-records-page',
  imports: [
    LocalDatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters">
      <mat-form-field class="select" subscriptSizing="dynamic">
        <mat-label>{{ 'stats.records.search' | transloco }}</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input
          matInput
          type="search"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
      </mat-form-field>
    </div>

    <mat-card appearance="outlined" class="card">
      @if (!store.recordsLoaded()) {
        <p class="empty">{{ 'common.loading' | transloco }}</p>
      } @else if (!store.records().length) {
        <p class="empty">{{ 'stats.records.empty' | transloco }}</p>
      } @else {
        <div class="scroll">
          <table class="sg-table">
            <thead>
              <tr>
                <th scope="col">{{ 'stats.records.exercise' | transloco }}</th>
                <th scope="col" class="num">{{ 'exercises.records.maxWeight' | transloco }}</th>
                <th scope="col" class="num">{{ 'exercises.records.bestE1RM' | transloco }}</th>
                <th scope="col" class="num">{{ 'exercises.records.maxVolume' | transloco }}</th>
                <th scope="col">
                  <span class="cdk-visually-hidden">{{
                    'exercises.records.repsAtWeight' | transloco
                  }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (item of filtered(); track item.exerciseId) {
                @let open = expanded() === item.exerciseId;
                <tr>
                  <th scope="row">
                    <a [routerLink]="['/exercises', item.exerciseId]">{{
                      item.name ?? ('stats.records.unknown' | transloco)
                    }}</a>
                  </th>
                  @for (entry of [item.maxWeight, item.bestE1RM, item.maxVolume]; track $index) {
                    <td class="num">
                      @if (entry) {
                        <span class="value">{{ entry.value | weight: { digits: 1 } }}</span>
                        <span class="sub">
                          <!-- A session's volume isn't one set: no "weight × reps" for it. -->
                          @if ($index < 2) {
                            {{ entry.weightKg | weight }} × {{ entry.reps }} ·
                          }
                          {{ entry.achievedAt | localDate: 'short' }}
                        </span>
                      } @else {
                        —
                      }
                    </td>
                  }
                  <td>
                    <button
                      mat-icon-button
                      type="button"
                      [attr.aria-expanded]="open"
                      [attr.aria-label]="
                        'stats.records.repsBreakdown' | transloco: { name: item.name ?? '' }
                      "
                      (click)="toggle(item.exerciseId)"
                    >
                      <mat-icon>{{ open ? 'expand_less' : 'expand_more' }}</mat-icon>
                    </button>
                  </td>
                </tr>
                @if (open) {
                  <tr class="detail">
                    <td colspan="5">
                      @if (store.repsAtWeight()[item.exerciseId]; as reps) {
                        @if (reps.length) {
                          <p class="detail-title">
                            {{ 'exercises.records.repsAtWeight' | transloco }}
                          </p>
                          <ul class="reps">
                            @for (r of reps; track r.weightKg) {
                              <li>
                                <strong>{{ r.weightKg | weight }}</strong>
                                {{ 'exercises.records.reps' | transloco: { reps: r.value } }}
                                <span class="sub">{{ r.achievedAt | localDate: 'short' }}</span>
                              </li>
                            }
                          </ul>
                        } @else {
                          <p class="sub">{{ 'stats.records.noReps' | transloco }}</p>
                        }
                      } @else {
                        <p class="sub">{{ 'common.loading' | transloco }}</p>
                      }
                    </td>
                  </tr>
                }
              } @empty {
                <tr>
                  <td colspan="5" class="sub">{{ 'stats.records.noMatch' | transloco }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </mat-card>
  `,
  styleUrl: './stats-page.scss',
  styles: `
    .card {
      padding: 8px 0;
    }
    .scroll {
      overflow-x: auto;
    }
    .empty {
      margin: 24px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    th[scope='row'] {
      position: static;
      background: none;
      font: var(--mat-sys-body-large);
    }
    th[scope='row'] a {
      color: inherit;
    }
    .value {
      display: block;
      font-weight: 500;
    }
    .sub {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .detail td {
      background: var(--mat-sys-surface-container-low);
      white-space: normal;
    }
    .detail-title {
      margin: 0 0 4px;
      font: var(--mat-sys-label-large);
    }
    .reps {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 24px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class StatsRecordsPage {
  protected readonly store = inject(StatsStore);
  protected readonly query = signal('');
  protected readonly expanded = signal<string | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    const items = this.store
      .records()
      .slice()
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    return q ? items.filter((i) => (i.name ?? '').toLocaleLowerCase().includes(q)) : items;
  });

  constructor() {
    this.store.activate('records');
  }

  protected toggle(exerciseId: string): void {
    const open = this.expanded() === exerciseId ? null : exerciseId;
    this.expanded.set(open);
    if (open) void this.store.loadRepsAtWeight(open);
  }
}
