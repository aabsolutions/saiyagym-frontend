import {
  applyEach,
  applyWhen,
  hidden,
  max,
  maxLength,
  min,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { UnitSystem, kgToLb } from '../../shared/units/units';
import { ROUTINE_LIMITS, RoutineDraft } from './routine-draft';

/** Max suggested weight in the user's unit (the API caps at 1000 kg). */
const weightMax = (units: UnitSystem) =>
  Math.floor(units === 'imperial' ? kgToLb(ROUTINE_LIMITS.weightKg) : ROUTINE_LIMITS.weightKg);

/** Mirrors the API's DTO rules so errors show inline; the API validates again. */
export const routineSchema = (units: () => UnitSystem) =>
  schema<RoutineDraft>((path) => {
    required(path.name);
    maxLength(path.name, ROUTINE_LIMITS.name);
    validate(path.name, ({ value }) =>
      value() && !value().trim() ? { kind: 'required' } : undefined,
    );
    maxLength(path.notes, ROUTINE_LIMITS.notes);
    maxLength(path.items, ROUTINE_LIMITS.exercises);
    validate(path.items, ({ value }) => (value().length ? undefined : { kind: 'noExercises' }));

    applyEach(path.items, (item) => {
      maxLength(item.notes, ROUTINE_LIMITS.itemNotes);
      maxLength(item.sets, ROUTINE_LIMITS.sets);

      applyEach(item.sets, (set) => {
        required(set.repsMin);
        min(set.repsMin, 1);
        max(set.repsMin, ROUTINE_LIMITS.reps);
        required(set.repsMax);
        min(set.repsMax, 1);
        max(set.repsMax, ROUTINE_LIMITS.reps);
        validate(set.repsMax, ({ value, valueOf }) => {
          const low = valueOf(set.repsMin);
          const high = value();
          return low !== null && high !== null && high < low ? { kind: 'repsRange' } : undefined;
        });
        min(set.restSeconds, 0);
        max(set.restSeconds, ROUTINE_LIMITS.restSeconds);

        hidden(set.load, ({ valueOf }) => valueOf(set.loadMode) === 'none');
        applyWhen(
          set.load,
          ({ valueOf }) => valueOf(set.loadMode) === 'percent',
          (load) => {
            required(load);
            min(load, ROUTINE_LIMITS.percentMin);
            max(load, ROUTINE_LIMITS.percentMax);
          },
        );
        applyWhen(
          set.load,
          ({ valueOf }) => valueOf(set.loadMode) === 'weight',
          (load) => {
            required(load);
            min(load, 0);
            max(load, () => weightMax(units()));
          },
        );
      });

      const rule = item.progression;
      min(rule.increment, 0.1);
      min(rule.rounding, 0.1);
      applyWhen(
        rule,
        ({ value }) => value().kind === 'percent_1rm',
        (p) => {
          validate(p.weeks, ({ value }) => (value().length ? undefined : { kind: 'noWeeks' }));
          applyEach(p.weeks, (week) => {
            required(week.percent);
            min(week.percent, 30);
            max(week.percent, 110);
            min(week.reps, 1);
            max(week.reps, 30);
            min(week.sets, 1);
            max(week.sets, 20);
          });
        },
      );
    });
  });
