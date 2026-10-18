import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { PhysicalFields } from '../../shared/profile/physical-fields';
import { PreferencesFields } from '../../shared/profile/preferences-fields';
import {
  EMPTY_PROFILE,
  profileSchema,
  toProfileModel,
  toUpdateProfileDto,
} from '../../shared/profile/profile-form';
import { TrainingFields } from '../../shared/profile/training-fields';
import { ChangePasswordCard } from './change-password-card';
import { DeleteAccountDialog } from './delete-account-dialog';
import { ExportCard } from './export-card';
import { ProfileStore } from './profile.store';

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]; // ISO: 1 = Monday

@Component({
  selector: 'app-profile-page',
  imports: [
    ChangePasswordCard,
    ExportCard,
    FormField,
    FormRoot,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PhysicalFields,
    PreferencesFields,
    RouterLink,
    TrainingFields,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  protected readonly store = inject(ProfileStore);
  protected readonly prefs = inject(PreferencesStore);
  protected readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);

  protected readonly weekdays = WEEKDAYS;

  /** Server copy in the current units; re-derived after every save or units change. */
  private readonly model = linkedSignal(() => {
    const user = this.auth.user();
    return user ? toProfileModel(user.profile, this.prefs.units()) : { ...EMPTY_PROFILE };
  });

  protected readonly profileForm = form(
    this.model,
    profileSchema({ units: () => this.prefs.units(), requireTraining: false }),
    {
      submission: {
        action: async (field) => {
          await this.store.saveProfile(
            toUpdateProfileDto(field().value(), this.prefs.units(), this.auth.user()?.profile),
          );
          return undefined;
        },
      },
    },
  );

  protected readonly serverPrefs = computed(() => this.auth.user()?.preferences ?? null);

  /** Keeps a value set elsewhere (e.g. on mobile) selectable even if it isn't a preset. */
  protected readonly restOptions = computed(() => {
    const current = this.serverPrefs()?.defaultRestSeconds;
    return current && !REST_OPTIONS.includes(current)
      ? [...REST_OPTIONS, current].sort((a, b) => a - b)
      : REST_OPTIONS;
  });

  protected setRest(seconds: number): void {
    void this.store.savePreferences({ defaultRestSeconds: seconds });
  }

  protected setFirstDay(day: number): void {
    void this.store.savePreferences({ firstDayOfWeek: day });
  }

  protected openDeleteDialog(): void {
    // The dialog injects ProfileStore, which is provided by this route, not by root.
    this.dialog.open(DeleteAccountDialog, { injector: this.injector, maxWidth: '480px' });
  }
}
