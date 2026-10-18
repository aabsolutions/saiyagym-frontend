import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminExerciseTagDto } from '../../../api/models/admin-exercise-tag-dto';
import { slugRule } from '../../../shared/forms/slug';
import { ValidationMessagePipe } from '../../../shared/forms/validation-message.pipe';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { Translatable, fromTranslatable, translatable } from '../../../shared/i18n/translatable';

export interface TagDialogData {
  tag: AdminExerciseTagDto | null;
  save: (slug: string, name: Translatable) => Promise<boolean>;
}

const TAG_LIMITS = { slug: 60, name: 40 } as const;

@Component({
  selector: 'app-tag-dialog',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatableField,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ (data.tag ? 'admin.tags.editTitle' : 'admin.tags.newTitle') | transloco }}
    </h2>
    <form [formRoot]="tagForm">
      <mat-dialog-content>
        <mat-form-field class="full-width">
          <mat-label>{{ 'admin.fields.slug' | transloco }}</mat-label>
          <input matInput [formField]="tagForm.slug" />
          <mat-hint>{{
            (data.tag ? 'admin.fields.slugLocked' : 'admin.fields.slugHint') | transloco
          }}</mat-hint>
          <mat-error>{{ tagForm.slug().errors() | validationMessage }}</mat-error>
        </mat-form-field>
        <app-translatable-field labelKey="admin.fields.name" mandatory [formField]="tagForm.name" />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button type="submit" [disabled]="tagForm().submitting()">
          {{ 'common.save' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class TagDialog {
  protected readonly data = inject<TagDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TagDialog>);

  private readonly model = signal({
    slug: this.data.tag?.slug ?? '',
    name: fromTranslatable(this.data.tag?.name),
  });
  protected readonly tagForm = form(
    this.model,
    (path) => {
      slugRule(path.slug, TAG_LIMITS.slug, () => !this.data.tag);
      translatable(path.name, { required: true, maxLength: TAG_LIMITS.name });
    },
    {
      submission: {
        action: async (field) => {
          const { slug, name } = field().value();
          if (await this.data.save(slug, name)) this.ref.close(true);
          return undefined;
        },
      },
    },
  );
}
