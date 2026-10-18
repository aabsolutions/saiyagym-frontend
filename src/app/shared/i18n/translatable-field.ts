import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoPipe } from '@jsverse/transloco';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../../core/i18n/languages';
import { ValidationMessagePipe } from '../forms/validation-message.pipe';
import { Translatable, missingLanguages } from './translatable';

/**
 * Editor for a translatable DB field: one tab per configured language (`LANGUAGES`), so adding
 * a language to the app adds its tab here with no code change. Tabs without text are marked;
 * the default language is the required one. Works with `[formField]` (Signal Forms).
 *
 * ```html
 * <app-translatable-field labelKey="admin.fields.name" mandatory [formField]="f.name" />
 * ```
 */
@Component({
  selector: 'app-translatable-field',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="field" [class.invalid]="showErrors()">
      <legend>
        {{ labelKey() | transloco }}
        @if (mandatory()) {
          <span aria-hidden="true">*</span>
        }
      </legend>
      <mat-tab-group animationDuration="0ms" mat-stretch-tabs="false" class="tabs">
        @for (lang of languages; track lang.code) {
          @let empty = missing().includes(lang.code);
          <mat-tab>
            <ng-template mat-tab-label>
              <span [lang]="lang.code">{{ lang.label }}</span>
              @if (empty) {
                <span
                  class="dot"
                  [class.required]="lang.code === defaultLang"
                  [attr.aria-label]="'translatable.missing' | transloco"
                  role="img"
                ></span>
              }
            </ng-template>
            <mat-form-field class="full-width" subscriptSizing="dynamic">
              <mat-label>{{ labelKey() | transloco }} ({{ lang.code }})</mat-label>
              @if (multiline()) {
                <textarea
                  matInput
                  [rows]="rows()"
                  [lang]="lang.code"
                  [value]="value()[lang.code] ?? ''"
                  [attr.maxlength]="maxLength()"
                  [required]="mandatory() && lang.code === defaultLang"
                  (input)="write(lang.code, $any($event.target).value)"
                  (blur)="touch.emit()"
                ></textarea>
              } @else {
                <input
                  matInput
                  [lang]="lang.code"
                  [value]="value()[lang.code] ?? ''"
                  [attr.maxlength]="maxLength()"
                  [required]="mandatory() && lang.code === defaultLang"
                  (input)="write(lang.code, $any($event.target).value)"
                  (blur)="touch.emit()"
                />
              }
            </mat-form-field>
          </mat-tab>
        }
      </mat-tab-group>
      @if (showErrors()) {
        <p class="error" role="alert">{{ errors() | validationMessage }}</p>
      }
    </fieldset>
  `,
  styles: `
    .field {
      min-width: 0;
      margin: 0 0 16px;
      padding: 8px 12px 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-small);
    }
    .field.invalid {
      border-color: var(--mat-sys-error);
    }
    legend {
      padding: 0 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }
    .tabs {
      margin-bottom: 8px;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-left: 6px;
      border-radius: 50%;
      background: var(--mat-sys-outline);
    }
    .dot.required {
      background: var(--mat-sys-error);
    }
    .error {
      margin: 4px 0 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class TranslatableField implements FormValueControl<Translatable> {
  readonly value = model<Translatable>({});
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touched = input(false);
  /** Marks the default language as required (the rule itself lives in the schema). */
  readonly mandatory = input(false, { transform: booleanAttribute });
  readonly maxLength = input<number | undefined>(undefined);
  readonly touch = output<void>();

  readonly labelKey = input.required<string>();
  readonly multiline = input(false, { transform: booleanAttribute });
  readonly rows = input(3);

  protected readonly languages = LANGUAGES;
  protected readonly defaultLang = DEFAULT_LANGUAGE;
  protected readonly missing = computed(() => missingLanguages(this.value()));
  protected readonly showErrors = computed(() => this.touched() && this.errors().length > 0);

  protected write(lang: string, text: string): void {
    this.value.update((map) => ({ ...map, [lang]: text }));
  }
}
