import { GuidesDto } from '../../api/models/guides-dto';
import { guideStatusOf, instructionSteps } from './exercise-guide';

const access: GuidesDto = {
  guidesPerRoutine: 5,
  items: [
    {
      exerciseId: 'squat',
      guides: [
        {
          id: 'g1',
          kind: 'animation',
          url: 'https://cdn/g1.gif',
          width: 480,
          height: 480,
          caption: '',
        },
      ],
    },
  ],
  lockedExerciseIds: ['bench'],
};

describe('guideStatusOf', () => {
  it('unlocked, locked by the plan, or none', () => {
    expect(guideStatusOf(access, 'squat')).toEqual({
      kind: 'unlocked',
      guides: access.items[0]!.guides,
    });
    expect(guideStatusOf(access, 'bench')).toEqual({ kind: 'locked' });
    expect(guideStatusOf(access, 'curl')).toEqual({ kind: 'none' });
    expect(guideStatusOf(null, 'squat')).toEqual({ kind: 'none' });
  });
});

describe('instructionSteps', () => {
  it('one step per line, trimmed, without empty lines', () => {
    expect(instructionSteps(' Paso uno \n\nPaso dos\n')).toEqual(['Paso uno', 'Paso dos']);
  });

  it('drops numbering or bullets typed by hand (the list numbers them)', () => {
    expect(instructionSteps('1. Uno\n2) Dos\n- Tres\n• Cuatro')).toEqual([
      'Uno',
      'Dos',
      'Tres',
      'Cuatro',
    ]);
    // A number that is part of the text stays.
    expect(instructionSteps('90° de rodilla')).toEqual(['90° de rodilla']);
  });

  it('nothing written: no steps', () => {
    expect(instructionSteps('')).toEqual([]);
    expect(instructionSteps(null)).toEqual([]);
  });
});
