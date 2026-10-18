import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { map } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { LanguageMenu } from '../../core/layout/language-menu';
import { OnboardingState } from '../../core/onboarding/onboarding';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { PhysicalFields } from '../../shared/profile/physical-fields';
import { PreferencesFields } from '../../shared/profile/preferences-fields';
import {
  EMPTY_PROFILE,
  profileSchema,
  toProfileModel,
  toUpdateProfileDto,
} from '../../shared/profile/profile-form';
import { TrainingFields } from '../../shared/profile/training-fields';

/** First-login wizard. Language/units first: the height step is asked in the chosen unit. */
@Component({
  selector: 'app-onboarding-page',
  imports: [
    FormRoot,
    LanguageMenu,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    PhysicalFields,
    PreferencesFields,
    TrainingFields,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="onboarding">
      <header>
        <span class="logo" aria-hidden="true"><mat-icon>bolt</mat-icon></span>
        <div>
          <h1>{{ 'onboarding.title' | transloco: { name: auth.displayName() } }}</h1>
          <p>{{ 'onboarding.subtitle' | transloco }}</p>
        </div>
      </header>

      <form [formRoot]="profileForm">
        <mat-stepper linear [orientation]="isHandset() ? 'vertical' : 'horizontal'">
          <mat-step [label]="'onboarding.steps.preferences' | transloco">
            <p class="hint">{{ 'onboarding.hints.preferences' | transloco }}</p>
            <app-preferences-fields [showTheme]="false" />
            <div class="actions">
              <button mat-button type="button" (click)="skip()">
                {{ 'onboarding.skip' | transloco }}
              </button>
              <button mat-flat-button type="button" matStepperNext>
                {{ 'onboarding.next' | transloco }}
              </button>
            </div>
          </mat-step>

          <mat-step [label]="'onboarding.steps.physical' | transloco" [completed]="physicalValid()">
            <p class="hint">{{ 'onboarding.hints.physical' | transloco }}</p>
            <app-physical-fields [fields]="profileForm" [units]="prefs.units()" />
            <div class="actions">
              <button mat-button type="button" matStepperPrevious>
                {{ 'onboarding.back' | transloco }}
              </button>
              <button mat-flat-button type="button" matStepperNext>
                {{ 'onboarding.next' | transloco }}
              </button>
            </div>
          </mat-step>

          <mat-step [label]="'onboarding.steps.training' | transloco">
            <p class="hint">{{ 'onboarding.hints.training' | transloco }}</p>
            <app-training-fields [fields]="profileForm" [allowEmpty]="false" />
            <div class="actions">
              <button mat-button type="button" matStepperPrevious>
                {{ 'onboarding.back' | transloco }}
              </button>
              <button mat-flat-button type="submit" [disabled]="profileForm().submitting()">
                {{ 'onboarding.finish' | transloco }}
              </button>
            </div>
          </mat-step>
        </mat-stepper>
      </form>

      <div class="lang"><app-language-menu /></div>
    </main>
  `,
  styles: `
    .onboarding {
      position: relative;
      max-width: 760px;
      margin: 0 auto;
      padding: 32px 16px 48px;
    }
    header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      h1 {
        margin: 0;
        font: var(--mat-sys-headline-small);
      }
      p {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
      }
    }
    .logo {
      display: grid;
      place-items: center;
      flex: none;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: var(--mat-sys-primary);
      color: var(--sg-gold);
      box-shadow: inset 0 -3px 0 var(--sg-gold);
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
    .lang {
      position: absolute;
      top: 16px;
      right: 16px;
    }
  `,
})
export class OnboardingPage {
  protected readonly auth = inject(AuthStore);
  protected readonly prefs = inject(PreferencesStore);
  private readonly onboarding = inject(OnboardingState);
  private readonly router = inject(Router);

  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.XSmall)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  /** Re-derived when units change, so the height is always shown in the chosen unit. */
  private readonly model = linkedSignal(() => {
    const user = this.auth.user();
    return user ? toProfileModel(user.profile, this.prefs.units()) : { ...EMPTY_PROFILE };
  });

  protected readonly profileForm = form(
    this.model,
    profileSchema({ units: () => this.prefs.units(), requireTraining: true }),
    {
      submission: {
        action: async (field) => {
          try {
            await this.auth.updateMe({
              profile: toUpdateProfileDto(
                field().value(),
                this.prefs.units(),
                this.auth.user()?.profile,
              ),
            });
            await this.router.navigateByUrl('/dashboard');
          } catch {
            // errorInterceptor already showed the translated reason.
          }
          return undefined;
        },
      },
    },
  );

  protected physicalValid(): boolean {
    const f = this.profileForm;
    return f.birthDate().valid() && f.sex().valid() && f.height().valid();
  }

  protected async skip(): Promise<void> {
    this.onboarding.skip();
    await this.router.navigateByUrl('/dashboard');
  }
}
