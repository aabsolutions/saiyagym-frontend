import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminUserDto } from '../../../api/models/admin-user-dto';
import { AuthStore } from '../../../core/auth/auth.store';
import { LocalDatePipe } from '../../../shared/format/local-date.pipe';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { AssignPlanDialog, AssignPlanDialogData } from './assign-plan-dialog';
import { AdminUsersStore, ROLES, Role, USERS_PAGE_SIZE } from './admin-users.store';

@Component({
  selector: 'app-admin-users-page',
  imports: [
    LocalDatePipe,
    LocalizedPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  providers: [AdminUsersStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-label>{{ 'admin.users.search' | transloco }}</mat-label>
        <mat-icon matPrefix aria-hidden="true">search</mat-icon>
        <input
          matInput
          type="search"
          [value]="store.search()"
          (input)="store.setSearch($any($event.target).value)"
        />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'admin.users.role' | transloco }}</mat-label>
        <mat-select [value]="store.role()" (valueChange)="store.setRole($event)">
          <mat-option [value]="null">{{ 'nutrition.all' | transloco }}</mat-option>
          @for (role of roles; track role) {
            <mat-option [value]="role">{{ 'admin.roles.' + role | transloco }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    <mat-card appearance="outlined" class="card">
      <div class="scroll" [class.pending]="store.pending()">
        <table class="sg-table">
          <caption class="cdk-visually-hidden">
            {{
              'admin.tabs.users' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'admin.users.user' | transloco }}</th>
              <th scope="col">{{ 'admin.users.role' | transloco }}</th>
              <th scope="col">{{ 'admin.users.plan' | transloco }}</th>
              <th scope="col">{{ 'admin.users.registered' | transloco }}</th>
              <th scope="col" class="actions-cell">
                <span class="cdk-visually-hidden">{{ 'common.actions' | transloco }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (user of store.items(); track user.id) {
              @let plan = store.planById().get(user.subscription.planId ?? '');
              <tr>
                <th scope="row">
                  {{ user.email }}
                  @if (!user.emailVerified) {
                    <span class="badge off">{{ 'admin.users.unverified' | transloco }}</span>
                  }
                  <span class="sub">{{ user.name ?? '—' }}</span>
                </th>
                <td>
                  <mat-form-field subscriptSizing="dynamic" class="inline">
                    <mat-label>{{ 'admin.users.role' | transloco }}</mat-label>
                    <!-- Your own role stays as is: demoting yourself would lock you out. -->
                    <mat-select
                      [value]="user.role"
                      [disabled]="user.id === myId()"
                      (valueChange)="changeRole(user, $event)"
                    >
                      @for (role of roles; track role) {
                        <mat-option [value]="role">{{
                          'admin.roles.' + role | transloco
                        }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </td>
                <td>
                  {{ plan ? (plan.name | localized) : '—' }}
                  <span class="sub">
                    {{ 'admin.users.status.' + user.subscription.status | transloco }}
                    @if (user.subscription.currentPeriodEnd; as end) {
                      · {{ 'admin.users.untilDate' | transloco: { date: (end | localDate) } }}
                    }
                  </span>
                </td>
                <td>{{ user.createdAt | localDate }}</td>
                <td class="actions-cell">
                  <button mat-stroked-button type="button" (click)="openAssign(user)">
                    {{ 'admin.users.assign' | transloco }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">{{ 'admin.users.empty' | transloco }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <mat-paginator
        [length]="store.total()"
        [pageIndex]="store.page() - 1"
        [pageSize]="pageSize"
        [hidePageSize]="true"
        (page)="onPage($event)"
      />
    </mat-card>
  `,
  styleUrl: '../admin.scss',
  styles: `
    .inline {
      width: 140px;
    }
  `,
})
export class AdminUsersPage {
  protected readonly store = inject(AdminUsersStore);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthStore);

  protected readonly roles = ROLES;
  protected readonly pageSize = USERS_PAGE_SIZE;
  protected readonly myId = () => this.auth.user()?.id;

  protected changeRole(user: AdminUserDto, role: Role): void {
    void this.store.changeRole(user, role);
  }

  protected openAssign(user: AdminUserDto): void {
    const data: AssignPlanDialogData = {
      user,
      plans: this.store.plans(),
      save: (body) => this.store.assignPlan(user, body),
    };
    this.dialog.open(AssignPlanDialog, { data, width: '440px', maxWidth: '95vw' });
  }

  protected onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1);
  }
}
