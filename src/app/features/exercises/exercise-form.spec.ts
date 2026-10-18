import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { exerciseDetail } from './exercise-fixtures.spec-helpers';
import {
  ExerciseFormModel,
  emptyExerciseForm,
  exerciseSchema,
  toCreateDto,
  toExerciseForm,
  toUpdateDto,
} from './exercise-form';

const filled = (): ExerciseFormModel => ({
  ...emptyExerciseForm(),
  name: '  Seal row ',
  primaryMuscle: 'upper_back',
  secondaryMuscles: ['lats', 'upper_back', 'rear_delts'],
  equipment: 'barbell',
  mechanic: 'compound',
});

describe('exercise form mapping', () => {
  it('builds a minimal create DTO (no empty texts, primary not repeated)', () => {
    expect(toCreateDto(filled(), null)).toEqual({
      name: 'Seal row',
      primaryMuscle: 'upper_back',
      equipment: 'barbell',
      mechanic: 'compound',
      secondaryMuscles: ['lats', 'rear_delts'],
      tags: [],
    });
  });

  it('sends cleared texts and image as null on update', () => {
    const dto = toUpdateDto(filled(), null);
    expect(dto).toMatchObject({ description: null, instructions: null, imageUrl: null });
  });

  it('keeps the uploaded image URL', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/x.jpg';
    expect(toCreateDto(filled(), url).imageUrl).toBe(url);
    expect(toUpdateDto(filled(), url).imageUrl).toBe(url);
  });

  it('loads an existing custom exercise into the form', () => {
    const model = toExerciseForm(
      exerciseDetail({ name: 'My row', description: 'd', instructions: 'i', tags: ['basic'] }),
    );
    expect(model).toMatchObject({ name: 'My row', description: 'd', tags: ['basic'] });
  });
});

describe('exerciseSchema', () => {
  const build = () => {
    const model = signal(emptyExerciseForm());
    return { model, f: form(model, exerciseSchema, { injector: TestBed.inject(Injector) }) };
  };

  it('requires name, primary muscle, equipment and mechanic', () => {
    const { f } = build();
    expect(f.name().errors()[0]?.kind).toBe('required');
    expect(f.primaryMuscle().errors()[0]?.kind).toBe('required');
    expect(f.equipment().errors()[0]?.kind).toBe('required');
    expect(f.mechanic().errors()[0]?.kind).toBe('required');
  });

  it('rejects a whitespace-only name and is valid once filled', () => {
    const { model, f } = build();
    model.set({ ...filled(), name: '   ' });
    expect(f.name().errors()[0]?.kind).toBe('required');
    model.set(filled());
    expect(f().valid()).toBe(true);
  });

  it('caps secondary muscles at 6', () => {
    const { model, f } = build();
    model.set({
      ...filled(),
      secondaryMuscles: ['lats', 'traps', 'biceps', 'forearms', 'rear_delts', 'abs', 'obliques'],
    });
    expect(f.secondaryMuscles().errors()[0]?.kind).toBe('maxLength');
  });
});
