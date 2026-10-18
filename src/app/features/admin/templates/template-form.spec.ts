import { AdminProgramTemplateDto } from '../../../api/models/admin-program-template-dto';
import {
  addRoutine,
  copyFirstWeek,
  newSet,
  removeRoutine,
  renameRoutineKey,
  resizeWeeks,
  setDay,
  templateProblems,
  toCreateTemplateDto,
  toTemplateForm,
} from './template-form';

const template = (): AdminProgramTemplateDto => ({
  id: 't1',
  slug: 'ppl',
  name: { es: 'Empuje-Tirón-Pierna', en: 'Push Pull Legs' },
  goal: 'hypertrophy',
  level: 'intermediate',
  durationWeeks: 2,
  deload: { mode: 'weight', percent: 40, weeks: [2] },
  routines: [
    {
      key: 'push',
      name: { es: 'Empuje' },
      exercises: [{ exerciseSlug: 'press-banca', sets: [newSet()], notes: '' }],
    },
  ],
  weeks: [{ days: [{ weekday: 1, routineKey: 'push' }] }, { days: [] }],
  createdAt: '',
  updatedAt: '',
});

describe('program template form', () => {
  it('maps the schedule to a week × weekday grid and back', () => {
    const model = toTemplateForm(template(), (slug) =>
      slug === 'press-banca' ? 'Press banca' : '',
    );
    expect(model.weeks[0]).toEqual(['push', null, null, null, null, null, null]);
    expect(model.routines[0].exercises[0].exerciseName).toBe('Press banca');
    const dto = toCreateTemplateDto(setDay(model, 1, 4, 'push'));
    expect(dto.weeks).toEqual([
      { days: [{ weekday: 1, routineKey: 'push' }] },
      { days: [{ weekday: 4, routineKey: 'push' }] },
    ]);
    expect(dto.routines[0].exercises[0]).not.toHaveProperty('notes');
  });

  it('new weeks repeat the last one; shrinking drops deload weeks past the end', () => {
    const model = toTemplateForm(template(), () => '');
    const longer = resizeWeeks(setDay(model, 1, 3, 'push'), 4);
    expect(longer.weeks).toHaveLength(4);
    expect(longer.weeks[3][2]).toBe('push');
    expect(resizeWeeks(model, 1).deload.weeks).toEqual([]);
    expect(copyFirstWeek(model).weeks[1]).toEqual(model.weeks[0]);
  });

  it('renaming or removing a routine keeps the schedule consistent', () => {
    const model = toTemplateForm(template(), () => '');
    expect(renameRoutineKey(model, 0, 'empuje').weeks[0][0]).toBe('empuje');
    expect(removeRoutine(model, 0).weeks[0][0]).toBeNull();
    expect(addRoutine(model).routines.map((r) => r.key)).toEqual(['push', 'r2']);
  });

  it('reports what the API would reject', () => {
    const model = toTemplateForm(template(), () => '');
    expect(templateProblems(model, false)).toEqual([]);
    const broken = addRoutine(renameRoutineKey(model, 0, 'Push!'));
    const kinds = templateProblems({ ...broken, slug: '' }, true).map((p) => p.kind);
    expect(kinds).toEqual(['slug', 'routineKey', 'routineName', 'noExercises']);
    const unscheduled = { ...model, weeks: model.weeks.map((w) => w.map(() => null)) };
    expect(templateProblems(unscheduled, false).map((p) => p.kind)).toEqual(['notScheduled']);
  });
});
