import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { ProgramDto } from '../../api/models/program-dto';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { ActivateDialog } from './activate-dialog';
import { ProgramsStore } from './programs.store';

@Component({
  selector: 'app-program-list-page',
  imports: [
    LocalDatePipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    RouterLink,
    TranslocoPipe,
    UpgradeCta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <a mat-flat-button routerLink="/programs/new">
        <mat-icon>add</mat-icon>
        {{ 'programs.list.create' | transloco }}
      </a>
      <a mat-stroked-button routerLink="/programs/templates">
        <mat-icon>auto_awesome</mat-icon>
        {{ 'programs.list.fromTemplate' | transloco }}
      </a>
    </div>

    @if (!store.canActivate()) {
      <app-upgrade-cta
        limit="activePrograms"
        [limitValue]="store.activeLimit()"
        [compact]="true"
        class="limit"
      />
    }

    @if (store.isPending()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <ul class="list">
      @for (program of store.programs(); track program.id) {
        <li class="card" [class]="'status-' + program.status">
          <a class="main" [routerLink]="['/programs', program.id, 'edit']">
            <span class="title">
              <span class="name">{{ program.name }}</span>
              <span class="status">{{ 'programs.status.' + program.status | transloco }}</span>
            </span>
            <span class="meta">
              <span>{{
                'programs.wizard.weeksCount' | transloco: { count: program.durationWeeks }
              }}</span>
              @if (program.startDate) {
                <span>{{
                  'programs.list.startedOn' | transloco: { date: (program.startDate | localDate) }
                }}</span>
              }
            </span>
          </a>
          <button
            mat-icon-button
            type="button"
            [matMenuTriggerFor]="menu"
            [attr.aria-label]="'programs.list.actions' | transloco: { name: program.name }"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #menu="matMenu" xPosition="before">
            @switch (program.status) {
              @case ('draft') {
                <button mat-menu-item type="button" (click)="activate(program)">
                  <mat-icon>play_arrow</mat-icon>
                  <span>{{ 'programs.list.activate' | transloco }}</span>
                </button>
              }
              @case ('active') {
                <a mat-menu-item routerLink="/programs/week">
                  <mat-icon>calendar_view_week</mat-icon>
                  <span>{{ 'programs.tabs.week' | transloco }}</span>
                </a>
                <button mat-menu-item type="button" (click)="store.deactivate(program)">
                  <mat-icon>pause</mat-icon>
                  <span>{{ 'programs.list.deactivate' | transloco }}</span>
                </button>
                <button mat-menu-item type="button" (click)="store.complete(program)">
                  <mat-icon>flag</mat-icon>
                  <span>{{ 'programs.list.complete' | transloco }}</span>
                </button>
              }
            }
            <a mat-menu-item [routerLink]="['/programs', program.id, 'edit']">
              <mat-icon>edit</mat-icon>
              <span>{{ 'routines.list.edit' | transloco }}</span>
            </a>
            <button mat-menu-item type="button" class="danger-item" (click)="store.remove(program)">
              <mat-icon>delete</mat-icon>
              <span>{{ 'programs.list.delete' | transloco }}</span>
            </button>
          </mat-menu>
        </li>
      } @empty {
        @if (store.isFulfilled()) {
          <li class="empty">{{ 'programs.list.empty' | transloco }}</li>
        }
      }
    </ul>
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .limit {
      display: block;
      margin-bottom: 16px;
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
      &.status-active {
        border-left: 4px solid var(--sg-gold);
      }
      &.status-completed {
        opacity: 0.75;
      }
    }
    .main {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
      color: inherit;
      text-decoration: none;
    }
    .title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .name {
      font: var(--mat-sys-title-medium);
    }
    .status {
      padding: 2px 8px;
      border-radius: var(--mat-sys-corner-full);
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font: var(--mat-sys-label-small);
    }
    .status-active .status {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
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
export class ProgramListPage implements OnInit {
  protected readonly store = inject(ProgramsStore);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    void this.store.load();
  }

  protected async activate(program: ProgramDto): Promise<void> {
    const startDate = await firstValueFrom(
      this.dialog.open(ActivateDialog, { data: { name: program.name } }).afterClosed(),
    );
    if (typeof startDate === 'string') await this.store.activate(program, startDate);
  }
}
