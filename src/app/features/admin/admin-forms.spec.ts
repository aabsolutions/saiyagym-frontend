import { AdminExerciseDto } from '../../api/models/admin-exercise-dto';
import { PlanResponseDto } from '../../api/models/plan-response-dto';
import {
  toCreateFoodDto,
  toCreateMealDto,
  toFoodForm,
  toMealForm,
  validGrams,
} from './nutrition/nutrition-forms';
import { toCreatePlanDto, toPlanForm, toUpdatePlanDto } from './plans/plan-form';
import { changeCount, setTierChange, tierOf, toBulkItems } from './tiers/tier-changes';

const plan = (): PlanResponseDto => ({
  id: 'p1',
  code: 'premium',
  name: { es: 'Premium', en: 'Premium' },
  description: { es: 'Todo' },
  active: true,
  isDefault: false,
  sortOrder: 2,
  createdAt: '',
  updatedAt: '',
  entitlements: {
    limits: { routines: null, activePrograms: 3, customExercises: null },
    features: {
      fullStats: true,
      autoProgression: true,
      progressPhotos: true,
      fullNutrition: true,
      dataExport: false,
      premiumSounds: true,
    },
    statsHistoryDays: null,
    guidesPerRoutine: null,
  },
});

describe('plan form', () => {
  it('null limits are "unlimited" and come back as null', () => {
    const model = toPlanForm(plan());
    expect(model.limits.routines).toEqual({ unlimited: true, value: 0 });
    expect(model.limits.activePrograms).toEqual({ unlimited: false, value: 3 });
    model.limits.routines = { unlimited: false, value: 10 };
    model.statsHistory = { unlimited: false, value: 365 };
    const dto = toUpdatePlanDto(model);
    expect(dto.entitlements?.limits).toEqual({
      routines: 10,
      activePrograms: 3,
      customExercises: null,
    });
    expect(dto.entitlements?.statsHistoryDays).toBe(365);
    expect(dto).not.toHaveProperty('code');
  });

  it('the premiumSounds toggle round-trips through the plan DTO', () => {
    const model = toPlanForm(plan());
    expect(model.features.premiumSounds).toBe(true);
    model.features.premiumSounds = false;
    expect(toUpdatePlanDto(model).entitlements?.features.premiumSounds).toBe(false);
  });

  it('guides per routine: null = unlimited, a number round-trips', () => {
    const model = toPlanForm(plan());
    expect(model.guides).toEqual({ unlimited: true, value: 5 });
    model.guides = { unlimited: false, value: 3 };
    expect(toUpdatePlanDto(model).entitlements?.guidesPerRoutine).toBe(3);
    // A new plan suggests Free's value.
    expect(toCreatePlanDto(toPlanForm(null)).entitlements.guidesPerRoutine).toBe(5);
  });

  it('a new plan starts closed (limits 0, no features) and sends its code', () => {
    const model = toPlanForm(null);
    model.code = ' gold ';
    model.name = { es: 'Oro', en: '' };
    const dto = toCreatePlanDto(model);
    expect(dto.code).toBe('gold');
    expect(dto.name).toEqual({ es: 'Oro' });
    expect(dto.entitlements.limits.routines).toBe(0);
    expect(Object.values(dto.entitlements.features).every((f) => !f)).toBe(true);
    expect(dto).not.toHaveProperty('description');
  });
});

describe('bulk tiers', () => {
  const ex = (id: string, hypertrophy: 'S' | 'A' | null): AdminExerciseDto =>
    ({ id, tiers: { hypertrophy, powerlifting: null } }) as AdminExerciseDto;

  it('tracks only real changes, per goal, and sends them in one request', () => {
    const squat = ex('squat', 'S');
    let changes = setTierChange({}, squat, 'hypertrophy', 'A');
    changes = setTierChange(changes, squat, 'powerlifting', 'S');
    changes = setTierChange(changes, ex('curl', null), 'hypertrophy', null); // no-op
    expect(changeCount(changes)).toBe(2);
    expect(tierOf(changes, squat, 'hypertrophy')).toBe('A');
    expect(toBulkItems(changes)).toEqual([{ id: 'squat', hypertrophy: 'A', powerlifting: 'S' }]);
    // Back to the stored value: nothing left to send for that goal.
    changes = setTierChange(changes, squat, 'hypertrophy', 'S');
    expect(toBulkItems(changes)).toEqual([{ id: 'squat', powerlifting: 'S' }]);
  });
});

describe('nutrition admin forms', () => {
  it('foods round macros to the API precision', () => {
    const model = { ...toFoodForm(null), slug: 'avena', name: { es: 'Avena', en: 'Oats' } };
    model.proteinG = 13.456;
    expect(toCreateFoodDto(model).per100g.proteinG).toBe(13.5);
  });

  it('meal items send slug + grams only (the name is display)', () => {
    const model = toMealForm(null, () => '');
    model.slug = 'avena-con-leche';
    model.name = { es: 'Avena con leche', en: '' };
    model.items = [{ foodSlug: 'avena', foodName: 'Avena', grams: 60 }];
    expect(toCreateMealDto(model).items).toEqual([{ foodSlug: 'avena', grams: 60 }]);
    expect(validGrams(60)).toBe(true);
    expect(validGrams(0)).toBe(false);
    expect(validGrams(12.5)).toBe(false);
  });
});
