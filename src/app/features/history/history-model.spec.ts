import { WorkoutSummaryDto } from '../../api/models/workout-summary-dto';
import {
  emptyHistoryFilters,
  filtersFromParams,
  filtersToParams,
  groupByLocalDay,
  localDayStart,
  monthGrid,
  monthRange,
  routineColorIndex,
  shiftMonth,
  toListParams,
} from './history-model';

const ROUTINE = '1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b';
const EXERCISE = '6f9619ff-8b86-4011-b42d-00c04fc964ff';

describe('history filters', () => {
  it('turns inclusive local days into the API’s [from, to) instants', () => {
    const params = toListParams(
      { ...emptyHistoryFilters(), from: '2026-10-01', to: '2026-10-31', routineId: ROUTINE },
      2,
    );
    expect(params).toMatchObject({
      status: 'all',
      page: 2,
      routineId: ROUTINE,
      from: localDayStart('2026-10-01'),
      to: localDayStart('2026-11-01'), // the day AFTER `to`
    });
    // Local midnight, whatever the time zone.
    expect(new Date(params.from!).getHours()).toBe(0);
  });

  it('round-trips through the URL and drops invalid values', () => {
    const filters = { from: '2026-10-01', to: null, routineId: ROUTINE, exerciseId: EXERCISE };
    const params = filtersToParams(filters, '2026-05', 3);
    expect(filtersFromParams(params)).toEqual(filters);
    expect(params).toMatchObject({ month: '2026-05', page: 3 });

    expect(filtersFromParams({ from: '10/01/2026', routine: 'nope', exercise: '1; drop' })).toEqual(
      emptyHistoryFilters(),
    );
  });
});

describe('calendar', () => {
  it('shifts months across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('covers the month in whole weeks from the user’s first weekday', () => {
    // October 2026 starts on a Thursday.
    const monday = monthGrid('2026-10', 1);
    expect(monday[0][0]).toBe('2026-09-28');
    expect(monday.at(-1)!.at(-1)).toBe('2026-11-01');
    expect(monday.every((w) => w.length === 7)).toBe(true);

    const sunday = monthGrid('2026-10', 7);
    expect(sunday[0][0]).toBe('2026-09-27');
    expect(sunday.flat()).toContain('2026-10-31');
  });

  it('queries the month by local midnights', () => {
    expect(monthRange('2026-10')).toEqual({
      from: localDayStart('2026-10-01'),
      to: localDayStart('2026-11-01'),
    });
  });

  it('groups sessions by the LOCAL day they started', () => {
    const at = (startedAt: string) => ({ id: startedAt, startedAt }) as WorkoutSummaryDto;
    const late = new Date(2026, 9, 5, 23, 30).toISOString(); // 23:30 local on the 5th
    const days = groupByLocalDay([at(late), at(new Date(2026, 9, 6, 7, 0).toISOString())]);
    expect([...days.keys()]).toEqual(['2026-10-05', '2026-10-06']);
  });

  it('gives each routine a stable color slot', () => {
    expect(routineColorIndex('b', ['a', 'b'])).toBe(1);
    expect(routineColorIndex('i', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'])).toBe(0);
    expect(routineColorIndex(null, ['a'])).toBeNull();
    expect(routineColorIndex('zz', ['a'])).toBeNull();
  });
});
