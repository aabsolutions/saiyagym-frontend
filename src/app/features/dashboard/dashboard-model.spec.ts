import { TodayDto } from '../../api/models/today-dto';
import { RecordsSummaryItemDto } from '../../api/models/records-summary-item-dto';
import { findNextWorkout, latestRecords } from './dashboard-model';

const day = (
  date: string,
  status: TodayDto['status'],
  patch: Partial<TodayDto> = {},
): TodayDto => ({
  date,
  dayLabel: null,
  isDeloadWeek: false,
  programId: 'p',
  programName: 'PPL',
  progressionEnabled: false,
  routine: status === 'training' ? { id: 'r', name: 'Push', notes: '', exercises: [] } : null,
  startsInDays: null,
  status,
  totalWeeks: 8,
  week: 1,
  ...patch,
});

describe('findNextWorkout', () => {
  it('today, when today is a training day (one call)', async () => {
    const fetch = vi.fn(async (date: string) => day(date, 'training'));
    const next = await findNextWorkout(fetch, '2026-10-18');
    expect(next.date).toBe('2026-10-18');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('on a rest day, the first training day of the following week', async () => {
    const fetch = vi.fn(async (date: string) =>
      day(date, date === '2026-10-21' ? 'training' : 'rest'),
    );
    const next = await findNextWorkout(fetch, '2026-10-18');
    expect(next.date).toBe('2026-10-21');
    expect(next.day.routine?.name).toBe('Push');
  });

  it('before the start, looks from the start day', async () => {
    const fetch = vi.fn(async (date: string) =>
      date === '2026-10-18'
        ? day(date, 'not_started', { startsInDays: 3 })
        : day(date, date >= '2026-10-21' ? 'training' : 'not_started'),
    );
    expect((await findNextWorkout(fetch, '2026-10-18')).date).toBe('2026-10-21');
  });

  it('nothing ahead once the program is finished', async () => {
    const fetch = vi.fn(async (date: string) => day(date, 'finished'));
    const next = await findNextWorkout(fetch, '2026-10-18');
    expect(next.date).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('latestRecords', () => {
  const entry = (achievedAt: string) => ({
    value: 1,
    weightKg: 1,
    reps: 1,
    workoutId: 'w',
    achievedAt,
  });

  it('newest first across exercises and types, capped', () => {
    const items: RecordsSummaryItemDto[] = [
      {
        exerciseId: 'a',
        name: 'Squat',
        maxWeight: entry('2026-10-01T00:00:00Z'),
        bestE1RM: entry('2026-10-05T00:00:00Z'),
        maxVolume: null,
      },
      {
        exerciseId: 'b',
        name: 'Bench',
        maxWeight: entry('2026-10-03T00:00:00Z'),
        bestE1RM: null,
        maxVolume: null,
      },
    ];
    expect(latestRecords(items, 2).map((r) => `${r.exerciseId}:${r.type}`)).toEqual([
      'a:bestE1RM',
      'b:maxWeight',
    ]);
  });
});
