import { exercise } from './exercise-fixtures.spec-helpers';
import { TierBoard, boardFromDto, moveToTier } from './tier-board';

const squat = exercise({ id: 'squat', name: 'Squat' });
const curl = exercise({ id: 'curl', name: 'Curl', tiers: { hypertrophy: 'B', powerlifting: 'C' } });
const bench = exercise({ id: 'bench', name: 'Bench press' });
const custom = exercise({
  id: 'mine',
  name: 'My row',
  isCustom: true,
  isGlobal: false,
  tiers: { hypertrophy: null, powerlifting: null },
});

const board = (): TierBoard =>
  boardFromDto({
    goal: 'hypertrophy',
    muscle: null,
    source: 'personal',
    tiers: { S: [bench, squat], B: [curl] },
    unranked: [custom],
  });

describe('tier board', () => {
  it('fills missing columns from the API response', () => {
    const { columns } = board();
    expect(columns.A).toEqual([]);
    expect(columns.C).toEqual([]);
  });

  it('moves an exercise between columns, sets the personal tier for the goal, keeps name order', () => {
    const next = moveToTier(board(), 'curl', 'S', 'hypertrophy');
    expect(next.columns.S.map((e) => e.id)).toEqual(['bench', 'curl', 'squat']);
    expect(next.columns.B).toEqual([]);
    // Only the board's goal changes: powerlifting keeps its own (empty) personal tier.
    expect(next.columns.S.find((e) => e.id === 'curl')?.personalTiers).toEqual({
      hypertrophy: 'S',
      powerlifting: null,
    });
  });

  it('moves an unranked (custom) exercise into a tier', () => {
    const next = moveToTier(board(), 'mine', 'A', 'hypertrophy');
    expect(next.unranked).toEqual([]);
    expect(next.columns.A.map((e) => e.id)).toEqual(['mine']);
  });

  it('is pure and ignores unknown exercises', () => {
    const before = board();
    const snapshot = structuredClone(before);
    moveToTier(before, 'curl', 'A', 'hypertrophy');
    expect(before).toEqual(snapshot);
    expect(moveToTier(before, 'nope', 'A', 'hypertrophy')).toBe(before);
  });
});
