import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService as AuthApi } from '../../api/services/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { Notifier } from '../../core/notify/notifier';

type VerifyState = 'verifying' | 'success' | 'failed' | 'missing';

/** Target of the verification email: `/verify-email?token=…`. Works signed in or not. */
@Component({
  selector: 'app-verify-email-page',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ 'auth.verify.title' | transloco }}</h1>

    @switch (state()) {
      @case ('verifying') {
        <div class="notice" role="status">
          <mat-spinner diameter="24" />
          <p>{{ 'auth.verify.verifying' | transloco }}</p>
        </div>
      }
      @case ('success') {
        <div class="notice" role="status">
          <mat-icon aria-hidden="true">verified</mat-icon>
          <p>{{ 'auth.verify.success' | transloco }}</p>
        </div>
      }
      @default {
        <div class="notice error" role="alert">
          <mat-icon aria-hidden="true">error</mat-icon>
          <p>
            {{
              (state() === 'missing' ? 'auth.verify.missingToken' : 'auth.verify.failed')
                | transloco
            }}
          </p>
        </div>
        @if (auth.isAuthenticated()) {
          <p class="alt">
            <button mat-button type="button" (click)="resend()">
              {{ 'auth.verify.resend' | transloco }}
            </button>
          </p>
        }
      }
    }

    @if (state() !== 'verifying') {
      <p class="alt">
        <a mat-flat-button [routerLink]="auth.isAuthenticated() ? '/dashboard' : '/login'">
          {{ 'auth.verify.continue' | transloco }}
        </a>
      </p>
    }
  `,
  styleUrl: './auth-form.scss',
})
export class VerifyEmailPage implements OnInit {
  private readonly authApi = inject(AuthApi);
  private readonly notifier = inject(Notifier);
  protected readonly auth = inject(AuthStore);

  readonly token = input<string>();
  protected readonly state = signal<VerifyState>('verifying');

  async ngOnInit(): Promise<void> {
    const token = this.token();
    if (!token) {
      this.state.set('missing');
      return;
    }
    try {
      await this.authApi.authControllerVerifyEmail({ body: { token } });
      this.state.set('success');
      await this.auth.whenReady();
      if (this.auth.isAuthenticated()) await this.auth.reloadUser();
    } catch {
      this.state.set('failed');
    }
  }

  protected async resend(): Promise<void> {
    try {
      await this.authApi.authControllerResendVerification();
      this.notifier.info('auth.verify.resent');
    } catch {
      // errorInterceptor already showed the translated reason.
    }
  }
}
