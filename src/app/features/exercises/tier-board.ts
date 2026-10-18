import { ExerciseSummaryDto } from '../../api/models/exercise-summary-dto';
import { TierListDto } from '../../api/models/tier-list-dto';
import { TIERS, Tier, TierGoal } from '../../shared/exercises/exercise-taxonomy';

export type TierColumns = Record<Tier, ExerciseSummaryDto[]>;

export interface TierBoard {
  columns: TierColumns;
  unranked: ExerciseSummaryDto[];
}

export const emptyBoard = (): TierBoard => ({
  columns: { S: [], A: [], B: [], C: [] },
  unranked: [],
});

export function boardFromDto(dto: TierListDto): TierBoard {
  const columns = Object.fromEntries(TIERS.map((t) => [t, dto.tiers[t] ?? []])) as TierColumns;
  return { columns, unranked: dto.unranked };
}

const byName = (a: ExerciseSummaryDto, b: ExerciseSummaryDto) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Personal mode: put `exerciseId` in column `to` (from any column or from unranked) and set
 * its personal tier FOR `goal` (the board's goal; the other goal is untouched). Columns stay
 * name-sorted, like the API returns them.
 * Pure: returns a new board, or the same one if the exercise isn't on it.
 */
export function moveToTier(
  board: TierBoard,
  exerciseId: string,
  to: Tier,
  goal: TierGoal,
): TierBoard {
  const all = [...TIERS.flatMap((t) => board.columns[t]), ...board.unranked];
  const exercise = all.find((e) => e.id === exerciseId);
  if (!exercise) return board;

  const without = (list: ExerciseSummaryDto[]) => list.filter((e) => e.id !== exerciseId);
  const columns = Object.fromEntries(
    TIERS.map((t) => [t, without(board.columns[t])]),
  ) as TierColumns;
  const moved = { ...exercise, personalTiers: { ...exercise.personalTiers, [goal]: to } };
  columns[to] = [...columns[to], moved].sort(byName);

  return { columns, unranked: without(board.unranked) };
}
