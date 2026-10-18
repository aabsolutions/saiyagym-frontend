import { ProgramDto } from '../../api/models/program-dto';
import {
  copyWeekToAll,
  emptyProgram,
  fromProgramDto,
  resizeWeeks,
  scheduledRoutineIds,
  setCell,
  syncTrainingMaxes,
  toProgramDto,
  toggleDeloadWeek,
} from './program-draft';

const dto: ProgramDto = {
  id: 'p1',
  name: 'PPL',
  notes: '',
  status: 'draft',
  durationWeeks: 2,
  startDate: null,
  activatedAt: null,
  completedAt: null,
  templateId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deload: { mode: 'sets', weeks: [2], percent: 30 },
  trainingMaxes: [{ exerciseId: 'squat', kg: 140 }],
  weeks: [
    {
      days: [
        { weekday: 1, routineId: 'push', routineName: 'Push', label: 'Heavy' },
        { weekday: 3, routineId: 'pull', routineName: 'Pull', label: null },
      ],
    },
    { days: [{ weekday: 5, routineId: 'legs', routineName: 'Legs', label: null }] },
  ],
};

describe('program draft', () => {
  it('round-trips the API program (labels kept, maxes in the user unit)', () => {
    const draft = fromProgramDto(dto, 'imperial');
    expect(draft.grid[0]).toEqual(['push', null, 'pull', null, null, null, null]);
    expect(draft.trainingMaxes).toEqual([{ exerciseId: 'squat', value: 308.65 }]);

    const body = toProgramDto(draft, 'imperial');
    expect(body.weeks[0].days).toEqual([
      { weekday: 1, routineId: 'push', label: 'Heavy' },
      { weekday: 3, routineId: 'pull' },
    ]);
    expect(body.deload).toEqual({ mode: 'sets', weeks: [2], percent: 30 });
    expect(body.trainingMaxes).toEqual([{ exerciseId: 'squat', kg: 140 }]);
  });

  it('new weeks repeat the last week; shrinking drops deload marks beyond the end', () => {
    let d = fromProgramDto(dto, 'metric');
    d = resizeWeeks(d, 4);
    expect(d.grid).toHaveLength(4);
    expect(d.grid[3]).toEqual(d.grid[1]);
    expect(d.grid[3]).not.toBe(d.grid[1]); // a copy, not the same row

    d = resizeWeeks(toggleDeloadWeek(d, 4), 3);
    expect(d.deloadWeeks).toEqual([2]);
  });

  it('clamps the length to 1–52 and ignores garbage', () => {
    const d = emptyProgram();
    expect(resizeWeeks(d, 99).durationWeeks).toBe(52);
    expect(resizeWeeks(d, 0).durationWeeks).toBe(1);
    expect(resizeWeeks(d, Number('abc'))).toBe(d);
  });

  it('edits cells and copies one week to all', () => {
    let d = setCell(emptyProgram(3), 0, 2, 'push');
    d = copyWeekToAll(d, 0);
    expect(d.grid.map((w) => w[1])).toEqual(['push', 'push', 'push']);
    expect(scheduledRoutineIds(setCell(d, 1, 5, 'legs'))).toEqual(['push', 'legs']);
  });

  it('only sends maxes that were filled in', () => {
    const d = syncTrainingMaxes(emptyProgram(), ['bench', 'squat']);
    d.trainingMaxes[1].value = 150;
    expect(toProgramDto(d, 'metric').trainingMaxes).toEqual([{ exerciseId: 'squat', kg: 150 }]);
  });

  it('syncTrainingMaxes returns the same draft when nothing changes (safe in an effect)', () => {
    const d = syncTrainingMaxes(emptyProgram(), ['bench']);
    expect(syncTrainingMaxes(d, ['bench'])).toBe(d);
    // A max typed for an exercise that no longer needs one is kept.
    const typed = { ...d, trainingMaxes: [{ exerciseId: 'bench', value: 100 }] };
    expect(syncTrainingMaxes(typed, []).trainingMaxes).toEqual([
      { exerciseId: 'bench', value: 100 },
    ]);
  });
});
