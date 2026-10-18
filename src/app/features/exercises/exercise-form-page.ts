import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
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
} from '../../shared/exercises/exercise-taxonomy';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { emptyExerciseForm, exerciseSchema, toExerciseForm } from './exercise-form';
import { ExerciseFormStore } from './exercise-form.store';
import { ExercisesStore } from './exercises.store';

@Component({
  selector: 'app-exercise-form-page',
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    RouterLink,
    TranslocoPipe,
    UpgradeCta,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-form-page.html',
  styleUrl: './exercise-form-page.scss',
})
export class ExerciseFormPage implements OnInit {
  protected readonly store = inject(ExerciseFormStore);
  protected readonly list = inject(ExercisesStore);
  private readonly router = inject(Router);

  /** Route param; absent when creating. */
  readonly id = input<string>();

  protected readonly muscles = MUSCLES;
  protected readonly equipment = EQUIPMENT;
  protected readonly mechanics = MECHANICS;
  protected readonly categories = CATEGORIES;

  protected readonly isEdit = computed(() => !!this.id());
  /** Creating with no slot left: show the upgrade path instead of a form that would 403. */
  protected readonly blocked = computed(() => !this.isEdit() && !this.list.canCreateCustom());

  private readonly model = signal(emptyExerciseForm());
  protected readonly exerciseForm = form(this.model, exerciseSchema, {
    submission: {
      action: async (field) => {
        const saved = await this.store.save(field().value());
        if (saved) {
          void this.list.refresh();
          void this.list.loadCustomCount();
          await this.router.navigate(['/exercises', saved.id]);
        }
        return undefined;
      },
    },
  });

  async ngOnInit(): Promise<void> {
    void this.store.loadTags();
    const id = this.id();
    if (id) {
      const exercise = await this.store.loadForEdit(id);
      if (exercise) this.model.set(toExerciseForm(exercise));
    } else {
      await this.list.loadCustomCount();
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // let the same file be picked again after removing it
    if (file) this.store.uploadImage(file);
  }
}
