import {
  applyEach,
  applyWhen,
  max,
  maxLength,
  min,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { UnitSystem, kgToLb } from '../../shared/units/units';
import { PROGRAM_LIMITS, ProgramDraft } from './program-draft';

const tmBounds = (units: UnitSystem) =>
  units === 'imperial'
    ? {
        min: Math.ceil(kgToLb(PROGRAM_LIMITS.trainingMaxKgMin)),
        max: Math.floor(kgToLb(PROGRAM_LIMITS.trainingMaxKgMax)),
      }
    : { min: PROGRAM_LIMITS.trainingMaxKgMin, max: PROGRAM_LIMITS.trainingMaxKgMax };

/** Mirrors CreateProgramDto + the API's cross-field checks; the API validates again. */
export const programSchema = (units: () => UnitSystem) =>
  schema<ProgramDraft>((path) => {
    required(path.name);
    maxLength(path.name, PROGRAM_LIMITS.name);
    validate(path.name, ({ value }) =>
      value() && !value().trim() ? { kind: 'required' } : undefined,
    );
    maxLength(path.notes, PROGRAM_LIMITS.notes);
    min(path.durationWeeks, PROGRAM_LIMITS.weeksMin);
    max(path.durationWeeks, PROGRAM_LIMITS.weeksMax);

    validate(path.grid, ({ value }) =>
      value().flat().some(Boolean) ? undefined : { kind: 'noTrainingDays' },
    );

    applyWhen(
      path.deloadPercent,
      ({ valueOf }) => valueOf(path.deloadWeeks).length > 0,
      (percent) => {
        required(percent);
        min(percent, PROGRAM_LIMITS.deloadMin);
        max(percent, PROGRAM_LIMITS.deloadMax);
      },
    );

    applyEach(path.trainingMaxes, (tm) => {
      min(tm.value, () => tmBounds(units()).min);
      max(tm.value, () => tmBounds(units()).max);
    });
  });
