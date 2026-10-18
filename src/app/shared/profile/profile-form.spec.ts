import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { ProfileDto } from '../../api/models/profile-dto';
import {
  EMPTY_PROFILE,
  ProfileFormModel,
  heightBounds,
  profileSchema,
  toProfileModel,
  toUpdateProfileDto,
  todayIso,
} from './profile-form';

const profile: ProfileDto = {
  name: 'Vegeta',
  birthDate: '1990-05-01',
  sex: 'male',
  heightCm: 164,
  level: 'advanced',
  goal: 'both',
};

describe('profile form mapping', () => {
  it('shows height in the user unit and round-trips to cm', () => {
    const metric = toProfileModel(profile, 'metric');
    expect(metric.height).toBe(164);
    expect(toUpdateProfileDto(metric, 'metric').heightCm).toBe(164);

    const imperial = toProfileModel(profile, 'imperial');
    expect(imperial.height).toBe(64.6);
    expect(toUpdateProfileDto({ ...imperial, height: 70 }, 'imperial', profile).heightCm).toBe(
      177.8,
    );
  });

  it('keeps the exact stored cm when the height was not edited (no rounding drift)', () => {
    const imperial = toProfileModel(profile, 'imperial');
    expect(toUpdateProfileDto(imperial, 'imperial', profile).heightCm).toBe(164);
    // Without the stored profile, in → cm rounding would turn 164 into 164.1.
    expect(toUpdateProfileDto(imperial, 'imperial').heightCm).toBe(164.1);
  });

  it('sends null for cleared fields, never empty strings', () => {
    const dto = toUpdateProfileDto({ ...EMPTY_PROFILE, name: '   ' }, 'metric');
    expect(dto).toEqual({
      name: null,
      birthDate: null,
      sex: null,
      heightCm: null,
      level: null,
      goal: null,
    });
  });

  it('maps an empty API profile to an empty form', () => {
    const empty = toProfileModel(
      { name: null, birthDate: null, sex: null, heightCm: null, level: null, goal: null },
      'metric',
    );
    expect(empty).toEqual(EMPTY_PROFILE);
  });

  it('keeps the API height bounds in both unit systems', () => {
    expect(heightBounds('metric')).toEqual({ min: 50, max: 272 });
    expect(heightBounds('imperial')).toEqual({ min: 19.7, max: 107.1 });
  });

  it('formats today as a local YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('profileSchema', () => {
  const build = (requireTraining: boolean, units: 'metric' | 'imperial' = 'metric') => {
    const model = signal<ProfileFormModel>({ ...EMPTY_PROFILE });
    const f = form(model, profileSchema({ units: () => units, requireTraining }), {
      injector: TestBed.inject(Injector),
    });
    return { model, f };
  };

  it('lets the profile page leave level and goal empty', () => {
    const { f } = build(false);
    expect(f().valid()).toBe(true);
  });

  it('requires level and goal during onboarding', () => {
    const { model, f } = build(true);
    expect(f.level().errors()[0]?.kind).toBe('required');
    model.set({ ...EMPTY_PROFILE, level: 'beginner', goal: 'hypertrophy' });
    expect(f().valid()).toBe(true);
  });

  it('validates height in the display unit', () => {
    const { model, f } = build(false, 'imperial');
    model.set({ ...EMPTY_PROFILE, height: 120 });
    expect(f.height().errors()[0]?.kind).toBe('max');
    model.set({ ...EMPTY_PROFILE, height: 70 });
    expect(f.height().valid()).toBe(true);
  });

  it('rejects birth dates in the future', () => {
    const { model, f } = build(false);
    model.set({ ...EMPTY_PROFILE, birthDate: '2999-01-01' });
    expect(f.birthDate().errors()[0]?.kind).toBe('futureDate');
  });
});
