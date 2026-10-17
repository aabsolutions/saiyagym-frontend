import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-user-menu',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      type="button"
      class="avatar"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="'toolbar.account' | transloco"
    >
      <span aria-hidden="true">{{ initials() }}</span>
    </button>
    <mat-menu #menu="matMenu" xPosition="before">
      <div class="who">
        <strong>{{ auth.displayName() }}</strong>
        <span>{{ auth.plan()?.name }}</span>
      </div>
      <mat-divider />
      <a mat-menu-item routerLink="/profile">
        <mat-icon>person</mat-icon>
        <span>{{ 'toolbar.profile' | transloco }}</span>
      </a>
      <button mat-menu-item type="button" (click)="auth.logout()">
        <mat-icon>logout</mat-icon>
        <span>{{ 'toolbar.logout' | transloco }}</span>
      </button>
      <button mat-menu-item type="button" (click)="auth.logoutAll()">
        <mat-icon>devices</mat-icon>
        <span>{{ 'toolbar.logoutAll' | transloco }}</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .avatar {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
      font: var(--mat-sys-label-large);
    }
    .who {
      display: flex;
      flex-direction: column;
      padding: 8px 16px 12px;
      font: var(--mat-sys-body-medium);
      span {
        color: var(--mat-sys-on-surface-variant);
      }
    }
  `,
})
export class UserMenu {
  protected readonly auth = inject(AuthStore);

  protected readonly initials = computed(() => {
    const name = this.auth.displayName().trim();
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  });
}
