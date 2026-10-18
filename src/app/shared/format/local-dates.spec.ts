import {
  addDaysIso,
  fromIso,
  isoWeekday,
  orderedWeekdays,
  todayIso,
  weekDatesIso,
} from './local-dates';

describe('local dates', () => {
  it('parses as local midnight (not UTC)', () => {
    const d = fromIso('2026-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0]);
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('adds days across month and year ends', () => {
    expect(addDaysIso('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('gives ISO weekdays (Monday 1 … Sunday 7)', () => {
    expect(isoWeekday('2026-10-19')).toBe(1); // Monday
    expect(isoWeekday('2026-10-25')).toBe(7); // Sunday
  });

  it('orders the week from the user’s first day', () => {
    expect(orderedWeekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(orderedWeekdays(7)).toEqual([7, 1, 2, 3, 4, 5, 6]);
  });

  it('lists the 7 dates of the week containing a date', () => {
    // Wednesday 2026-10-21.
    expect(weekDatesIso('2026-10-21', 1)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
    expect(weekDatesIso('2026-10-21', 7)[0]).toBe('2026-10-18'); // Sunday-first
    expect(weekDatesIso('2026-10-18', 7)[0]).toBe('2026-10-18'); // already the first day
  });
});
