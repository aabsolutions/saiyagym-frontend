import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import {
  draftVolumeKg,
  fromWorkoutDetail,
  removeWorkoutSet,
  toUpdateWorkoutDto,
  workoutSchema,
} from './workout-draft';
import { workoutDetail } from './workout-fixtures.spec-helpers';

describe('workout draft', () => {
  it('re-sends the exact stored kg for weights that were not edited (no lb rounding drift)', () => {
    const draft = fromWorkoutDetail(workoutDetail(), 'imperial');
    expect(draft.exercises[0].sets[1].weight).toBe(225.97);
    const body = toUpdateWorkoutDto(draft, 'imperial');
    expect(body.exercises![0].sets.map((s) => s.weightKg)).toEqual([60, 102.5, 102.5]);
  });

  it('converts an edited weight and keeps every id the PATCH needs', () => {
    const draft = fromWorkoutDetail(workoutDetail(), 'imperial');
    draft.exercises[0].sets[2] = { ...draft.exercises[0].sets[2], weight: 230, reps: 4 };
    const [ex] = toUpdateWorkoutDto(draft, 'imperial').exercises!;
    expect(ex).toMatchObject({ id: 'we1', exerciseId: 'bench', routineExerciseId: 'slot-1' });
    expect(ex.sets[2]).toEqual({
      id: 's2',
      type: 'normal',
      weightKg: 104.33,
      reps: 4,
      completed: true,
      completedAt: null,
    });
  });

  it('removes a set and recomputes the volume like the API (no warmups)', () => {
    let draft = fromWorkoutDetail(workoutDetail(), 'metric');
    expect(draftVolumeKg(draft, 'metric')).toBe(1025);
    draft = removeWorkoutSet(draft, 0, 2);
    expect(draft.exercises[0].sets.map((s) => s.id)).toEqual(['s0', 's1']);
    expect(draftVolumeKg(draft, 'metric')).toBe(512.5);
  });

  it('validates rating and set bounds', () => {
    const model = signal({ ...fromWorkoutDetail(workoutDetail(), 'metric'), rating: 6 });
    const f = form(
      model,
      workoutSchema(() => 'metric'),
      { injector: TestBed.inject(Injector) },
    );
    expect(f.rating().errors()[0]?.kind).toBe('max');
    model.update((d) => ({ ...d, rating: 5 }));
    expect(f().valid()).toBe(true);
    model.update((d) => ({
      ...d,
      exercises: [{ ...d.exercises[0], sets: [{ ...d.exercises[0].sets[0], reps: -1 }] }],
    }));
    expect(f.exercises[0].sets[0].reps().errors()[0]?.kind).toBe('min');
  });
});
