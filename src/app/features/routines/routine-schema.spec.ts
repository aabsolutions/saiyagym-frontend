import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { RoutineDraft, newItem } from './routine-draft';
import { routineSchema } from './routine-schema';

const exercise = {
  id: 'bench',
  name: 'Bench',
  primaryMuscle: 'chest',
  equipment: 'barbell',
  mechanic: 'compound',
  imageUrl: null,
};

const build = (draft: RoutineDraft, units: 'metric' | 'imperial' = 'metric') => {
  const model = signal(draft);
  const f = form(
    model,
    routineSchema(() => units),
    { injector: TestBed.inject(Injector) },
  );
  return { model, f };
};

const withSet = (patch: Partial<RoutineDraft['items'][number]['sets'][number]>): RoutineDraft => {
  const item = newItem(exercise);
  return { name: 'Push', notes: '', items: [{ ...item, sets: [{ ...item.sets[0], ...patch }] }] };
};

describe('routineSchema', () => {
  it('needs a name and at least one exercise', () => {
    const { f } = build({ name: '  ', notes: '', items: [] });
    expect(f.name().errors()[0]?.kind).toBe('required');
    expect(f.items().errors()[0]?.kind).toBe('noExercises');
  });

  it('accepts a default new exercise', () => {
    expect(build(withSet({})).f().valid()).toBe(true);
  });

  it('rejects a reps range upside down', () => {
    const { f } = build(withSet({ repsMin: 10, repsMax: 8 }));
    expect(f.items[0].sets[0].repsMax().errors()[0]?.kind).toBe('repsRange');
  });

  it('checks the load only in its own mode', () => {
    expect(
      build(withSet({ loadMode: 'none', load: 9999 }))
        .f()
        .valid(),
    ).toBe(true);
    const percent = build(withSet({ loadMode: 'percent', load: 150 })).f;
    expect(percent.items[0].sets[0].load().errors()[0]?.kind).toBe('max');
    const missing = build(withSet({ loadMode: 'weight', load: null })).f;
    expect(missing.items[0].sets[0].load().errors()[0]?.kind).toBe('required');
  });

  it('caps the weight in the user unit (1000 kg ≈ 2204 lb)', () => {
    expect(
      build(withSet({ loadMode: 'weight', load: 2000 }), 'imperial')
        .f()
        .valid(),
    ).toBe(true);
    expect(
      build(withSet({ loadMode: 'weight', load: 2000 }), 'metric')
        .f()
        .valid(),
    ).toBe(false);
  });

  it('a %1RM rule needs weeks with valid percents', () => {
    const draft = withSet({});
    const item = draft.items[0];
    const rule = (
      weeks: { percent: number | null; reps: number | null; sets: number | null }[],
    ) => ({
      ...draft,
      items: [
        { ...item, progression: { ...item.progression, kind: 'percent_1rm' as const, weeks } },
      ],
    });
    expect(build(rule([])).f.items[0].progression.weeks().errors()[0]?.kind).toBe('noWeeks');
    expect(
      build(rule([{ percent: 20, reps: null, sets: null }]))
        .f()
        .valid(),
    ).toBe(false);
    expect(
      build(rule([{ percent: 75, reps: 5, sets: 3 }]))
        .f()
        .valid(),
    ).toBe(true);
  });
});
