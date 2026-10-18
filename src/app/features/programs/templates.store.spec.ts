import { ProgramTemplateDetailDto } from '../../api/models/program-template-detail-dto';
import { templateMaxNeeds } from './templates.store';

const set = (percent1RM: number | null = null) => ({
  type: 'normal' as const,
  repsMin: 5,
  repsMax: 5,
  percent1RM,
});

describe('templateMaxNeeds', () => {
  it('asks for a max only for %-based exercises that are still in the catalog', () => {
    const template = {
      routines: [
        {
          key: 'a',
          name: 'A',
          exercises: [
            {
              exerciseId: 'squat',
              name: 'Squat',
              exerciseSlug: 'squat',
              groupId: null,
              notes: '',
              sets: [set()],
              progression: { type: 'percent_1rm', weeks: [{ percent: 70 }] },
            },
            {
              exerciseId: 'bench',
              name: 'Bench',
              exerciseSlug: 'bench',
              groupId: null,
              notes: '',
              sets: [set(80)],
              progression: null,
            },
            {
              exerciseId: 'curl',
              name: 'Curl',
              exerciseSlug: 'curl',
              groupId: null,
              notes: '',
              sets: [set()],
              progression: { type: 'double_progression' },
            },
            {
              exerciseId: null,
              name: null,
              exerciseSlug: 'gone',
              groupId: null,
              notes: '',
              sets: [set(75)],
              progression: null,
            },
          ],
        },
        {
          key: 'b',
          name: 'B',
          exercises: [
            {
              exerciseId: 'squat',
              name: 'Squat',
              exerciseSlug: 'squat',
              groupId: null,
              notes: '',
              sets: [set(85)],
              progression: null,
            },
          ],
        },
      ],
    } as unknown as ProgramTemplateDetailDto;

    expect(templateMaxNeeds(template)).toEqual([
      { exerciseId: 'squat', name: 'Squat' },
      { exerciseId: 'bench', name: 'Bench' },
    ]);
  });
});
