import { ProfileDto } from '../../api/models/profile-dto';
import { ageFrom, boundsIn, calculatorModel, toCalculatorRequest } from './nutrition-model';

const profile = (patch: Partial<ProfileDto> = {}): ProfileDto =>
  ({
    name: 'Vegeta',
    birthDate: '1990-05-20',
    sex: 'male',
    heightCm: 164,
    level: 'advanced',
    goal: 'powerlifting',
    ...patch,
  }) as ProfileDto;

describe('nutrition calculator model', () => {
  const now = new Date(2026, 9, 18);

  it('age counts the birthday only once it has passed', () => {
    expect(ageFrom('1990-10-19', now)).toBe(35);
    expect(ageFrom('1990-10-18', now)).toBe(36);
    expect(ageFrom(null, now)).toBeNull();
  });

  it('prefills from the profile, in the user units', () => {
    const metric = calculatorModel(profile(), 'metric', now);
    expect(metric).toMatchObject({ sex: 'male', ageYears: 36, height: 164, weight: null });
    expect(calculatorModel(profile(), 'imperial', now).height).toBe(64.6);
    // "other" can't feed Mifflin-St Jeor: left for the user to choose.
    expect(calculatorModel(profile({ sex: 'other' }), 'metric', now).sex).toBeNull();
  });

  it('sends only what differs from the profile (no in → cm drift), weight always in kg', () => {
    const model = calculatorModel(profile(), 'imperial', now);
    expect(toCalculatorRequest(model, 'imperial', profile(), now)).toEqual({
      goal: 'maintenance',
      activityLevel: 'moderate',
    });
    const edited = { ...model, weight: 180, goal: 'cut' as const, height: 66 };
    expect(toCalculatorRequest(edited, 'imperial', profile(), now)).toEqual({
      goal: 'cut',
      activityLevel: 'moderate',
      heightCm: 167.6,
      weightKg: 81.6,
    });
  });

  it('bounds follow the unit and stay inside the API range', () => {
    expect(boundsIn('weight', 'metric')).toEqual({ min: 35, max: 250 });
    const lb = boundsIn('weight', 'imperial');
    expect(lb.min).toBeGreaterThanOrEqual(77.1);
    expect(lb.max).toBeLessThanOrEqual(551.2);
  });
});
