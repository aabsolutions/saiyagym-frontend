import { RoutineDetailDto } from '../../api/models/routine-detail-dto';
import {
  DraftItem,
  RoutineDraft,
  fromRoutineDetail,
  linkedWithNext,
  moveItem,
  newItem,
  normalizeGroups,
  removeItem,
  toRoutineDto,
  toggleLinkWithNext,
  updateItem,
} from './routine-draft';

const info = (name: string) => ({
  name,
  primaryMuscle: 'chest',
  equipment: 'barbell',
  mechanic: 'compound',
  imageUrl: null,
});

const item = (id: string, groupId: string | null = null): DraftItem => ({
  ...newItem({ id: `ex-${id}`, ...info(id) }),
  id,
  groupId,
});

const draft = (...items: DraftItem[]): RoutineDraft => ({ name: 'Push', notes: '', items });
const groups = (d: RoutineDraft) => d.items.map((i) => i.groupId);

describe('supersets', () => {
  it('links an item with the next, then splits them again', () => {
    let d = draft(item('a'), item('b'), item('c'));
    d = toggleLinkWithNext(d, 0);
    expect(linkedWithNext(d.items, 0)).toBe(true);
    expect(d.items[2].groupId).toBeNull();

    d = toggleLinkWithNext(d, 0);
    expect(groups(d)).toEqual([null, null, null]);
  });

  it('grows an existing superset into a triset', () => {
    let d = toggleLinkWithNext(draft(item('a'), item('b'), item('c')), 0);
    d = toggleLinkWithNext(d, 1);
    const [g] = groups(d);
    expect(g).not.toBeNull();
    expect(groups(d)).toEqual([g, g, g]);
  });

  it('joins a following superset when linking into it', () => {
    let d = draft(item('a'), item('b', 'x'), item('c', 'x'));
    d = toggleLinkWithNext(d, 0);
    const [g] = groups(d);
    expect(groups(d)).toEqual([g, g, g]);
  });

  it('splitting the middle of a triset leaves the singles unlinked', () => {
    const d = toggleLinkWithNext(draft(item('a', 'x'), item('b', 'x'), item('c', 'x')), 0);
    expect(d.items[0].groupId).toBeNull(); // a alone: dissolved
    expect(linkedWithNext(d.items, 1)).toBe(true); // b+c still a superset
  });

  it('never leaves a superset non-contiguous or of one', () => {
    expect(
      groups({ ...draft(), items: normalizeGroups([item('a', 'x'), item('b'), item('c', 'x')]) }),
    ).toEqual([null, null, null]);
    expect(
      groups({
        ...draft(),
        items: normalizeGroups([item('a', 'x'), item('b', 'x'), item('c'), item('d', 'x')]),
      }),
    ).toEqual(['x', 'x', null, null]);
  });

  it('moving a member out of its superset breaks only that link', () => {
    const d = moveItem(draft(item('a', 'x'), item('b', 'x'), item('c')), 0, 2);
    expect(d.items.map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(groups(d)).toEqual([null, null, null]);
  });

  it('removing a member of a pair dissolves the pair', () => {
    expect(groups(removeItem(draft(item('a', 'x'), item('b', 'x')), 1))).toEqual([null]);
  });
});

describe('routine draft ↔ API', () => {
  const detail: RoutineDetailDto = {
    id: 'r1',
    name: 'Push',
    notes: '',
    archived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    exercises: [
      {
        id: 'slot-1',
        exerciseId: 'bench',
        exercise: info('Bench'),
        groupId: null,
        notes: '',
        sets: [
          {
            type: 'warmup',
            repsMin: 10,
            repsMax: 10,
            weightKg: 60,
            percent1RM: null,
            restSeconds: 60,
          },
          {
            type: 'normal',
            repsMin: 5,
            repsMax: 5,
            weightKg: null,
            percent1RM: 80,
            restSeconds: 180,
          },
        ],
        // Key order differs from what the client would build: must still be re-sent verbatim.
        progression: { roundingKg: 2.5, type: 'double_progression', incrementKg: 2.5 },
      },
    ],
  };

  it('edits weights in the user unit and sends kg back', () => {
    const d = fromRoutineDetail(detail, 'imperial');
    expect(d.items[0].sets[0]).toMatchObject({ loadMode: 'weight', load: 132.28 });
    expect(d.items[0].sets[1]).toMatchObject({ loadMode: 'percent', load: 80 });

    const edited = updateItem(d, 0, (it) => ({
      ...it,
      sets: [{ ...it.sets[0], load: 135 }, it.sets[1]],
    }));
    const [ex] = toRoutineDto(edited, 'imperial').exercises;
    expect(ex.sets[0]).toMatchObject({ weightKg: 61.23, percent1RM: null });
    expect(ex.sets[1]).toMatchObject({ weightKg: null, percent1RM: 80 });
  });

  it('re-sends an untouched progression rule exactly as stored (no false Premium check)', () => {
    const [ex] = toRoutineDto(fromRoutineDetail(detail, 'imperial'), 'imperial').exercises;
    expect(ex.progression).toBe(detail.exercises[0].progression);
  });

  it('converts an edited rule from the user unit', () => {
    const d = updateItem(fromRoutineDetail(detail, 'imperial'), 0, (it) => ({
      ...it,
      progression: { ...it.progression, increment: 10, rounding: null },
    }));
    expect(toRoutineDto(d, 'imperial').exercises[0].progression).toEqual({
      type: 'double_progression',
      incrementKg: 4.54,
    });
  });

  it('builds percent-of-1RM weeks and drops the rule with "none"', () => {
    let d = updateItem(fromRoutineDetail(detail, 'metric'), 0, (it) => ({
      ...it,
      progression: {
        kind: 'percent_1rm',
        increment: null,
        rounding: null,
        weeks: [
          { percent: 70, reps: 5, sets: null },
          { percent: 75, reps: null, sets: 3 },
        ],
        deload: null,
      },
    }));
    expect(toRoutineDto(d, 'metric').exercises[0].progression).toEqual({
      type: 'percent_1rm',
      weeks: [
        { percent: 70, reps: 5 },
        { percent: 75, sets: 3 },
      ],
    });

    d = updateItem(d, 0, (it) => ({ ...it, progression: { ...it.progression, kind: 'none' } }));
    expect(toRoutineDto(d, 'metric').exercises[0].progression).toBeNull();
  });

  it('keeps slot ids and trims texts', () => {
    const d = { ...fromRoutineDetail(detail, 'metric'), name: '  Push day ' };
    const dto = toRoutineDto(d, 'metric');
    expect(dto.name).toBe('Push day');
    expect(dto.exercises[0].id).toBe('slot-1');
  });
});
