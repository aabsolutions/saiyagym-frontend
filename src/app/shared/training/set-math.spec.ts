import { epley, isWorkingSet, volumeKg } from './set-math';

describe('set math (SPEC rules)', () => {
  it('Epley only for 1–12 reps', () => {
    expect(epley(100, 1)).toBe(103.3);
    expect(epley(102.5, 5)).toBe(119.6); // same value the API returns
    expect(epley(100, 12)).toBe(140);
    expect(epley(100, 13)).toBeNull();
    expect(epley(100, 0)).toBeNull();
    expect(epley(null, 5)).toBeNull();
  });

  it('warmups never count; incomplete sets neither', () => {
    expect(isWorkingSet('warmup')).toBe(false);
    expect(isWorkingSet('dropset')).toBe(true);
    expect(
      volumeKg([
        { type: 'warmup', weightKg: 60, reps: 10, completed: true },
        { type: 'normal', weightKg: 100, reps: 5, completed: true },
        { type: 'failure', weightKg: 90, reps: 8, completed: true },
        { type: 'normal', weightKg: 100, reps: 5, completed: false },
        { type: 'normal', weightKg: null, reps: 12, completed: true },
      ]),
    ).toBe(100 * 5 + 90 * 8);
  });
});
