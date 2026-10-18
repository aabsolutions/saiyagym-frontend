import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { RoutinesStore } from './routines.store';

@Component({
  selector: 'app-routine-list-page',
  imports: [
    LocalDatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    RouterLink,
    TranslocoPipe,
    UpgradeCta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="head">
        <h1 class="page-title">{{ 'pages.routines.title' | transloco }}</h1>
        @if (store.canCreate()) {
          <a mat-flat-button routerLink="/routines/new">
            <mat-icon>add</mat-icon>
            {{ 'routines.list.create' | transloco }}
          </a>
        }
      </div>

      @if (store.limit() !== null && store.activeCount() !== null) {
        <p class="usage">
          {{
            'routines.list.usage' | transloco: { count: store.activeCount(), max: store.limit() }
          }}
        </p>
      }
      @if (!store.canCreate()) {
        <app-upgrade-cta limit="routines" [limitValue]="store.limit()" [compact]="true" />
      }

      <mat-button-toggle-group
        class="view"
        [value]="store.view()"
        (change)="store.setView($event.value)"
        [attr.aria-label]="'routines.list.view' | transloco"
      >
        <mat-button-toggle value="active">{{
          'routines.list.active' | transloco
        }}</mat-button-toggle>
        <mat-button-toggle value="archived">{{
          'routines.list.archivedView' | transloco
        }}</mat-button-toggle>
      </mat-button-toggle-group>

      @if (store.isPending()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <ul class="list">
        @for (routine of store.items(); track routine.id) {
          <li class="card">
            <a class="main" [routerLink]="['/routines', routine.id]">
              <span class="name">{{ routine.name }}</span>
              <span class="meta">
                <span>{{
                  'routines.list.counts'
                    | transloco: { exercises: routine.exerciseCount, sets: routine.setCount }
                }}</span>
                <span>{{
                  'routines.list.updated' | transloco: { date: (routine.updatedAt | localDate) }
                }}</span>
              </span>
            </a>
            <button
              mat-icon-button
              type="button"
              [matMenuTriggerFor]="menu"
              [attr.aria-label]="'routines.list.actions' | transloco: { name: routine.name }"
            >
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu" xPosition="before">
              <a mat-menu-item [routerLink]="['/routines', routine.id]">
                <mat-icon>edit</mat-icon>
                <span>{{ 'routines.list.edit' | transloco }}</span>
              </a>
              <button mat-menu-item type="button" (click)="store.duplicate(routine)">
                <mat-icon>content_copy</mat-icon>
                <span>{{ 'routines.list.duplicate' | transloco }}</span>
              </button>
              @if (routine.archived) {
                <button mat-menu-item type="button" (click)="store.unarchive(routine)">
                  <mat-icon>unarchive</mat-icon>
                  <span>{{ 'routines.list.unarchive' | transloco }}</span>
                </button>
              } @else {
                <button mat-menu-item type="button" (click)="store.archive(routine)">
                  <mat-icon>archive</mat-icon>
                  <span>{{ 'routines.list.archive' | transloco }}</span>
                </button>
              }
              <button
                mat-menu-item
                type="button"
                class="danger-item"
                (click)="store.remove(routine)"
              >
                <mat-icon>delete</mat-icon>
                <span>{{ 'routines.list.delete' | transloco }}</span>
              </button>
            </mat-menu>
          </li>
        } @empty {
          @if (store.isFulfilled()) {
            <li class="empty">
              {{
                (store.view() === 'archived'
                  ? 'routines.list.emptyArchived'
                  : 'routines.list.empty'
                ) | transloco
              }}
            </li>
          }
        }
      </ul>
    </section>
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .usage {
      margin: 0 0 12px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .view {
      margin: 16px 0;
    }
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 8px 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface-container-low);
    }
    .main {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
      color: inherit;
      text-decoration: none;
    }
    .name {
      font: var(--mat-sys-title-medium);
    }
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      span + span::before {
        content: ' · ';
      }
    }
    .danger-item {
      color: var(--mat-sys-error);
    }
    .empty {
      grid-column: 1 / -1;
      padding: 32px 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class RoutineListPage {
  protected readonly store = inject(RoutinesStore);
}
