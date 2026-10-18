import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { ValidationMessagePipe } from '../../shared/forms/validation-message.pipe';
import { RequireFeatureDirective } from '../../shared/plans/require-feature.directive';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { UnitSystem } from '../../shared/units/units';
import { ProgressionEditor } from './progression-editor';
import { DraftItem, LoadMode, SET_TYPES } from './routine-draft';

const LOAD_MODES: readonly LoadMode[] = ['none', 'weight', 'percent'];

/**
 * One exercise of the routine being built. Presentational: inputs edit the form model;
 * structural changes (sets, supersets, removal) are emitted to the builder.
 */
@Component({
  selector: 'app-routine-item-editor',
  imports: [
    CdkDragHandle,
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ProgressionEditor,
    RequireFeatureDirective,
    TranslocoPipe,
    UpgradeCta,
    ValidationMessagePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-item-editor.html',
  styleUrl: './routine-item-editor.scss',
})
export class RoutineItemEditor {
  readonly item = input.required<FieldTree<DraftItem>>();
  readonly index = input.required<number>();
  readonly units = input.required<UnitSystem>();
  /** Part of a superset with the previous / next item (for the visual connector). */
  readonly linkedWithPrevious = input(false);
  readonly linkedWithNext = input(false);
  readonly isLast = input(false);

  readonly removed = output<void>();
  readonly linkToggled = output<void>();
  readonly setAdded = output<void>();
  readonly setRemoved = output<number>();
  readonly weekAdded = output<void>();
  readonly weekRemoved = output<number>();

  protected readonly setTypes = SET_TYPES;
  protected readonly loadModes = LOAD_MODES;
  protected readonly weightUnitKey = computed(() =>
    this.units() === 'imperial' ? 'units.lb' : 'units.kg',
  );
  protected readonly name = computed(() => this.item()().value().exercise?.name ?? '');
}
