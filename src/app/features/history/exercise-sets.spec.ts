import { toSetRows } from './exercise-sets';

describe('toSetRows', () => {
  it('flattens sessions into set rows with e1RM and volume for working sets only', () => {
    const rows = toSetRows([
      {
        workoutId: 'w2',
        startedAt: '2026-10-08T10:00:00Z',
        volumeKg: 500,
        bestE1RM: 116.7,
        sets: [
          { id: 'a', type: 'warmup', weightKg: 60, reps: 8, completed: true, completedAt: null },
          { id: 'b', type: 'normal', weightKg: 100, reps: 5, completed: true, completedAt: null },
          { id: 'c', type: 'normal', weightKg: 100, reps: 5, completed: false, completedAt: null },
        ],
      },
      {
        workoutId: 'w1',
        startedAt: '2026-10-01T10:00:00Z',
        volumeKg: 1200,
        bestE1RM: null,
        sets: [
          { id: 'd', type: 'normal', weightKg: 80, reps: 15, completed: true, completedAt: null },
        ],
      },
    ]);

    expect(rows.map((r) => [r.workoutId, r.n, r.firstOfSession])).toEqual([
      ['w2', 1, true],
      ['w2', 2, false],
      ['w2', 3, false],
      ['w1', 1, true],
    ]);
    expect(rows[0]).toMatchObject({ e1rm: null, volumeKg: null, sessionSets: 3 }); // warmup
    expect(rows[1]).toMatchObject({ e1rm: 116.7, volumeKg: 500 });
    expect(rows[2]).toMatchObject({ e1rm: null, volumeKg: null }); // not completed
    expect(rows[3]).toMatchObject({ e1rm: null, volumeKg: 1200 }); // 15 reps: no Epley
  });
});
