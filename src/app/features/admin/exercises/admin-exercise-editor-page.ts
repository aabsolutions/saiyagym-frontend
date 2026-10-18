import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CATEGORIES,
  EQUIPMENT,
  MECHANICS,
  MUSCLES,
  TIERS,
} from '../../../shared/exercises/exercise-taxonomy';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/languages';
import { slugify } from '../../../shared/forms/slug';
import { ValidationMessagePipe } from '../../../shared/forms/validation-message.pipe';
import { LocalizedPipe } from '../../../shared/i18n/localized.pipe';
import { TranslatableField } from '../../../shared/i18n/translatable-field';
import { AdminExerciseEditorStore } from './admin-exercise-editor.store';
import { adminExerciseSchema, toAdminExerciseForm } from './admin-exercise-form';

/** `/admin/exercises/new` and `/admin/exercises/:id` (the id comes as a route input). */
@Component({
  selector: 'app-admin-exercise-editor-page',
  imports: [
    FormField,
    FormRoot,
    LocalizedPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    RouterLink,
    TranslatableField,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  providers: [AdminExerciseEditorStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Full page outside the admin tabs: same page container as the shell.
  host: { class: 'page' },
  templateUrl: './admin-exercise-editor-page.html',
  styleUrl: '../admin.scss',
  styles: `
    .image {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      img,
      .placeholder {
        width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-surface-container-high);
      }
      .placeholder {
        display: grid;
        place-items: center;
      }
    }
    .card {
      padding: 16px;
    }
  `,
})
export class AdminExerciseEditorPage implements OnInit {
  protected readonly store = inject(AdminExerciseEditorStore);
  private readonly router = inject(Router);

  /** Route param (withComponentInputBinding); absent on /new. */
  readonly id = input<string>();
  protected readonly isNew = computed(() => !this.id());

  protected readonly muscles = MUSCLES;
  protected readonly equipment = EQUIPMENT;
  protected readonly mechanics = MECHANICS;
  protected readonly categories = CATEGORIES;
  protected readonly tiers = TIERS;

  private readonly model = signal(toAdminExerciseForm(null));
  private slugTouched = false;
  protected readonly exerciseForm = form(this.model, adminExerciseSchema(this.isNew), {
    submission: {
      action: async (field) => {
        const saved = await this.store.save(field().value());
        if (saved && this.isNew()) {
          await this.router.navigate(['/admin/exercises', saved.id], { replaceUrl: true });
        }
        return undefined;
      },
    },
  });

  constructor() {
    // Until the admin types a slug, it follows the default-language name.
    effect(() => {
      const name = this.model().name[DEFAULT_LANGUAGE] ?? '';
      if (!this.isNew() || this.slugTouched) return;
      const slug = slugify(name, 80);
      if (slug !== untracked(this.model).slug) this.model.update((m) => ({ ...m, slug }));
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (!id) return;
    const exercise = await this.store.load(id);
    if (exercise) {
      this.slugTouched = true;
      this.model.set(toAdminExerciseForm(exercise));
    }
  }

  protected onSlugInput(): void {
    this.slugTouched = true;
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.store.image.pick(file);
  }
}
