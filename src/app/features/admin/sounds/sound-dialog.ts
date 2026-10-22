import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom, last, tap } from 'rxjs';
import { AdminRestSoundDto } from '../../../api/models/admin-rest-sound-dto';
import { API_PREFIX } from '../../../core/http/api-request';
import { ValidationMessagePipe } from '../../../shared/forms/validation-message.pipe';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { AudioRejectedError, AudioUpload } from '../../../shared/media/audio-upload';
import {
  SOUND_ACCESS,
  SoundFormModel,
  formatKilobytes,
  formatSeconds,
  soundSchema,
  toSoundForm,
} from './sound-forms';

export type SoundSaveResult = { ok: true } | { ok: false; reasonKey: string | null };

export interface SoundDialogData {
  sound: AdminRestSoundDto | null;
  /** `publicId` is set when a (new) audio file was uploaded; always set on create. */
  save: (model: SoundFormModel, publicId: string | undefined) => Promise<SoundSaveResult>;
}

/** File picker `accept`: the formats the `rest_sound` signature allows. */
const ACCEPT = '.mp3,.wav,.m4a,.ogg,.aac,audio/*';

@Component({
  selector: 'app-sound-dialog',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    TranslatableField,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ (data.sound ? 'admin.sounds.editTitle' : 'admin.sounds.newTitle') | transloco }}
    </h2>
    <form [formRoot]="soundForm">
      <mat-dialog-content>
        <app-translatable-field
          labelKey="admin.fields.name"
          mandatory
          [formField]="soundForm.name"
        />
        <div class="form-grid">
          <mat-form-field>
            <mat-label>{{ 'admin.fields.slug' | transloco }}</mat-label>
            <input matInput [formField]="soundForm.slug" />
            <mat-error>{{ soundForm.slug().errors() | validationMessage }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'admin.sounds.access' | transloco }}</mat-label>
            <mat-select [formField]="soundForm.access">
              @for (a of accessOptions; track a) {
                <mat-option [value]="a">
                  {{ 'admin.sounds.accessValues.' + a | transloco }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'admin.fields.sortOrder' | transloco }}</mat-label>
            <input matInput type="number" [formField]="soundForm.sortOrder" />
          </mat-form-field>
        </div>

        <h3 class="section-title">{{ 'admin.sounds.audio' | transloco }}</h3>
        <p class="hint">{{ 'admin.sounds.audioHint' | transloco }}</p>
        @if (previewUrl(); as src) {
          <audio
            controls
            preload="none"
            [src]="src"
            [attr.aria-label]="'admin.sounds.preview' | transloco"
          ></audio>
        }
        @if (data.sound && !pendingFile()) {
          <p class="meta">
            {{ data.sound.format }} · {{ seconds(data.sound.durationSec) }} ·
            {{ kilobytes(data.sound.bytes) }}
          </p>
        }
        <input
          #picker
          type="file"
          class="cdk-visually-hidden"
          tabindex="-1"
          [accept]="accept"
          (change)="pick($event)"
        />
        <button mat-stroked-button type="button" (click)="picker.click()">
          <mat-icon>upload</mat-icon>
          {{ (data.sound ? 'admin.sounds.replaceAudio' : 'admin.sounds.chooseAudio') | transloco }}
        </button>
        @if (pendingFile(); as f) {
          <span class="file-name">{{ f.name }}</span>
        }
        @if (progress() !== null) {
          <mat-progress-bar mode="determinate" [value]="progress()" />
        }
        @if (audioError(); as key) {
          <p class="error" role="alert">{{ key | transloco }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button type="submit" [disabled]="soundForm().submitting()">
          {{ 'common.save' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: '../admin.scss',
  styles: `
    audio {
      display: block;
      width: 100%;
      margin-bottom: 8px;
    }
    .meta,
    .file-name {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .file-name {
      margin-left: 8px;
    }
    .error {
      margin: 8px 0 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class SoundDialog implements OnDestroy {
  protected readonly data = inject<SoundDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<SoundDialog>);
  private readonly audioUpload = inject(AudioUpload);

  protected readonly accessOptions = SOUND_ACCESS;
  protected readonly accept = ACCEPT;
  protected readonly seconds = formatSeconds;
  protected readonly kilobytes = formatKilobytes;

  protected readonly model = signal(toSoundForm(this.data.sound));
  protected readonly soundForm = form(
    this.model,
    soundSchema(() => !this.data.sound),
    {
      submission: {
        action: async () => {
          await this.submit();
          return undefined;
        },
      },
    },
  );

  /** The picked file; it only goes to Cloudinary on save. */
  protected readonly pendingFile = signal<File | null>(null);
  /** Stored after a successful upload, so retrying a failed save does not upload twice. */
  private uploadedPublicId: string | undefined;
  private localUrl: string | null = null;
  protected readonly previewUrl = signal<string | null>(this.data.sound?.mp3Url ?? null);
  protected readonly progress = signal<number | null>(null);
  /** Dictionary key of the audio problem to show under the picker. */
  protected readonly audioError = signal<string | null>(null);

  ngOnDestroy(): void {
    this.revokeLocalUrl();
  }

  protected pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.revokeLocalUrl();
    this.localUrl = URL.createObjectURL(file);
    this.pendingFile.set(file);
    this.uploadedPublicId = undefined;
    this.audioError.set(null);
    this.previewUrl.set(this.localUrl);
  }

  private async submit(): Promise<void> {
    this.audioError.set(null);
    if (!this.data.sound && !this.pendingFile()) {
      this.audioError.set('admin.sounds.audioRequired');
      return;
    }
    const publicId = await this.uploadIfPending();
    if (publicId === null) return; // upload failed: already reported
    const result = await this.data.save(this.model(), publicId);
    if (result.ok) this.ref.close(true);
    else if (result.reasonKey) {
      // The Cloudinary asset was rejected by the API (and destroyed): pick the file again.
      this.uploadedPublicId = undefined;
      this.audioError.set(result.reasonKey);
    }
  }

  /** The public id to save, `undefined` when the audio is not being replaced, `null` on failure. */
  private async uploadIfPending(): Promise<string | undefined | null> {
    const file = this.pendingFile();
    if (!file) return undefined;
    if (this.uploadedPublicId) return this.uploadedPublicId;
    this.progress.set(0);
    try {
      const done = await firstValueFrom(
        this.audioUpload.upload(file).pipe(
          tap((e) => {
            if (e.type === 'progress') this.progress.set(e.percent);
          }),
          last(),
        ),
      );
      if (done.type !== 'done') return null;
      this.uploadedPublicId = done.audio.publicId;
      return this.uploadedPublicId;
    } catch (error) {
      // API errors (e.g. MEDIA_NOT_CONFIGURED on the signature) were reported by the
      // errorInterceptor; Cloudinary's are not API requests, so say it here.
      const reportedByApi =
        error instanceof HttpErrorResponse && (error.url ?? '').includes(API_PREFIX);
      if (error instanceof AudioRejectedError) {
        this.audioError.set(`admin.sounds.rejected.${error.reason}`);
      } else if (!reportedByApi) {
        this.audioError.set('admin.sounds.rejected.failed');
      }
      return null;
    } finally {
      this.progress.set(null);
    }
  }

  private revokeLocalUrl(): void {
    if (this.localUrl) URL.revokeObjectURL(this.localUrl);
    this.localUrl = null;
  }
}
