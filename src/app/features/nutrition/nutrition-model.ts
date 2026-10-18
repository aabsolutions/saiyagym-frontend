import { CalculatorRequestDto } from '../../api/models/calculator-request-dto';
import { FoodDto } from '../../api/models/food-dto';
import { MealSuggestionDto } from '../../api/models/meal-suggestion-dto';
import { ProfileDto } from '../../api/models/profile-dto';
import { UnitSystem, cmToIn, inToCm, kgToLb, lbToKg } from '../../shared/units/units';

export type NutritionGoal = CalculatorRequestDto['goal'];
export type ActivityLevel = CalculatorRequestDto['activityLevel'];
export type FormulaSex = NonNullable<CalculatorRequestDto['sex']>;
export type MealType = MealSuggestionDto['mealType'];
export type FoodCategory = FoodDto['category'];
export type FoodTag = FoodDto['tags'][number];

/** Enums from the API contract, in display order. Labels: `nutrition.<group>.<value>`. */
export const NUTRITION_GOALS: readonly NutritionGoal[] = ['bulk', 'maintenance', 'cut'];
export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];
export const FORMULA_SEXES: readonly FormulaSex[] = ['male', 'female'];
export const MEAL_TYPES: readonly MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'pre_workout',
  'post_workout',
];
export const FOOD_CATEGORIES: readonly FoodCategory[] = [
  'meat',
  'fish',
  'eggs',
  'dairy',
  'legumes',
  'grains',
  'tubers',
  'fruits',
  'vegetables',
  'nuts_seeds',
  'fats_oils',
  'supplements',
  'other',
];
export const FOOD_TAGS: readonly FoodTag[] = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'lactose-free',
  'high-protein',
  'high-fiber',
  'low-fat',
];

/** API bounds (CALCULATOR_BOUNDS): Mifflin-St Jeor is validated for adults. */
export const CALCULATOR_BOUNDS = {
  ageYears: { min: 18, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 250 },
} as const;

/** Inputs in the user's units; empty = let the API use the profile / latest weigh-in. */
export interface CalculatorFormModel {
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
  sex: FormulaSex | null;
  ageYears: number | null;
  height: number | null;
  weight: number | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function ageFrom(birthDate: string | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

/** Prefilled from the profile so the user sees what will be used (and can override it). */
export function calculatorModel(
  profile: ProfileDto | null | undefined,
  units: UnitSystem,
  now = new Date(),
): CalculatorFormModel {
  const sex = profile?.sex === 'male' || profile?.sex === 'female' ? profile.sex : null;
  const cm = profile?.heightCm ?? null;
  return {
    goal: 'maintenance',
    activityLevel: 'moderate',
    sex,
    ageYears: ageFrom(profile?.birthDate, now),
    height: cm === null ? null : round1(units === 'imperial' ? cmToIn(cm) : cm),
    weight: null,
  };
}

export function boundsIn(field: 'height' | 'weight', units: UnitSystem) {
  const { min, max } = field === 'height' ? CALCULATOR_BOUNDS.heightCm : CALCULATOR_BOUNDS.weightKg;
  if (units === 'metric') return { min, max };
  const convert = field === 'height' ? cmToIn : kgToLb;
  return { min: Math.ceil(convert(min) * 10) / 10, max: Math.floor(convert(max) * 10) / 10 };
}

const isSet = (value: number | null): value is number => value !== null && !Number.isNaN(value);

/**
 * kg/cm for the API. A value equal to the stored profile is not sent: the API reads the exact
 * stored one (no in → cm rounding drift), and `sources` then says "profile".
 */
export function toCalculatorRequest(
  model: CalculatorFormModel,
  units: UnitSystem,
  profile: ProfileDto | null | undefined,
  now = new Date(),
): CalculatorRequestDto {
  const dto: CalculatorRequestDto = { goal: model.goal, activityLevel: model.activityLevel };
  const stored = calculatorModel(profile, units, now);
  if (model.sex && model.sex !== stored.sex) dto.sex = model.sex;
  if (isSet(model.ageYears) && model.ageYears !== stored.ageYears) dto.ageYears = model.ageYears;
  if (isSet(model.height) && model.height !== stored.height) {
    dto.heightCm = round1(units === 'imperial' ? inToCm(model.height) : model.height);
  }
  if (isSet(model.weight)) {
    dto.weightKg = round1(units === 'imperial' ? lbToKg(model.weight) : model.weight);
  }
  return dto;
}
