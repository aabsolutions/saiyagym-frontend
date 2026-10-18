import { max, min, required, schema, validate } from '@angular/forms/signals';
import { AdminFoodDto } from '../../../api/models/admin-food-dto';
import { AdminGuidelineDto } from '../../../api/models/admin-guideline-dto';
import { AdminMealSuggestionDto } from '../../../api/models/admin-meal-suggestion-dto';
import { CreateFoodDto } from '../../../api/models/create-food-dto';
import { CreateGuidelineDto } from '../../../api/models/create-guideline-dto';
import { CreateMealSuggestionDto } from '../../../api/models/create-meal-suggestion-dto';
import { UpdateFoodDto } from '../../../api/models/update-food-dto';
import { UpdateGuidelineDto } from '../../../api/models/update-guideline-dto';
import { UpdateMealSuggestionDto } from '../../../api/models/update-meal-suggestion-dto';
import { slugRule } from '../../../shared/forms/slug';
import {
  Translatable,
  fromTranslatable,
  toOptionalTranslatable,
  toTranslatable,
  translatable,
} from '../../../shared/i18n/translatable';
import { FoodCategory, FoodTag, MealType, NutritionGoal } from '../../nutrition/nutrition-model';

/** Mirrors the API DTOs (food/meal-suggestion/nutrition-guideline); the API validates again. */
export const NUTRITION_LIMITS = {
  slug: 60,
  foodName: 80,
  mealName: 120,
  mealDescription: 1000,
  mealItems: 20,
  grams: { min: 1, max: 2000 },
  title: 120,
  summary: 300,
  body: 4000,
  kcal: 900,
  macro: 100,
} as const;

/** The API takes one decimal for macros. */
const oneDecimal = (value: number) => Math.round(value * 10) / 10;

// ---------- Foods ----------

export interface FoodFormModel {
  slug: string;
  name: Translatable;
  category: FoodCategory;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  tags: FoodTag[];
}

export function toFoodForm(food: AdminFoodDto | null): FoodFormModel {
  return {
    slug: food?.slug ?? '',
    name: fromTranslatable(food?.name),
    category: food?.category ?? 'other',
    kcal: food?.per100g.kcal ?? 0,
    proteinG: food?.per100g.proteinG ?? 0,
    carbsG: food?.per100g.carbsG ?? 0,
    fatG: food?.per100g.fatG ?? 0,
    tags: [...(food?.tags ?? [])],
  };
}

export const foodSchema = (isNew: () => boolean) =>
  schema<FoodFormModel>((path) => {
    slugRule(path.slug, NUTRITION_LIMITS.slug, isNew);
    translatable(path.name, { required: true, maxLength: NUTRITION_LIMITS.foodName });
    for (const [field, limit] of [
      [path.kcal, NUTRITION_LIMITS.kcal],
      [path.proteinG, NUTRITION_LIMITS.macro],
      [path.carbsG, NUTRITION_LIMITS.macro],
      [path.fatG, NUTRITION_LIMITS.macro],
    ] as const) {
      required(field);
      min(field, 0);
      max(field, limit);
    }
  });

const per100g = (m: FoodFormModel) => ({
  kcal: oneDecimal(m.kcal),
  proteinG: oneDecimal(m.proteinG),
  carbsG: oneDecimal(m.carbsG),
  fatG: oneDecimal(m.fatG),
});

export const toCreateFoodDto = (m: FoodFormModel): CreateFoodDto => ({
  slug: m.slug,
  name: toTranslatable(m.name),
  category: m.category,
  per100g: per100g(m),
  tags: m.tags,
});

export const toUpdateFoodDto = (m: FoodFormModel): UpdateFoodDto => ({
  name: toTranslatable(m.name),
  category: m.category,
  per100g: per100g(m),
  tags: m.tags,
});

// ---------- Meal suggestions ----------

export interface MealItemModel {
  foodSlug: string;
  /** Shown next to the slug; not sent. */
  foodName: string;
  grams: number;
}

export interface MealFormModel {
  slug: string;
  name: Translatable;
  description: Translatable;
  goal: NutritionGoal;
  mealType: MealType;
  isSample: boolean;
  sortOrder: number;
  items: MealItemModel[];
}

export function toMealForm(
  meal: AdminMealSuggestionDto | null,
  foodName: (slug: string) => string,
): MealFormModel {
  return {
    slug: meal?.slug ?? '',
    name: fromTranslatable(meal?.name),
    description: fromTranslatable(meal?.description),
    goal: meal?.goal ?? 'maintenance',
    mealType: meal?.mealType ?? 'lunch',
    isSample: meal?.isSample ?? false,
    sortOrder: meal?.sortOrder ?? 0,
    items: (meal?.items ?? []).map((i) => ({
      foodSlug: i.foodSlug,
      foodName: foodName(i.foodSlug),
      grams: i.grams,
    })),
  };
}

export const mealSchema = (isNew: () => boolean) =>
  schema<MealFormModel>((path) => {
    slugRule(path.slug, NUTRITION_LIMITS.slug, isNew);
    translatable(path.name, { required: true, maxLength: NUTRITION_LIMITS.mealName });
    translatable(path.description, { maxLength: NUTRITION_LIMITS.mealDescription });
    validate(path.items, ({ value }) => {
      const items = value();
      if (!items.length) return { kind: 'mealNoItems' };
      if (items.length > NUTRITION_LIMITS.mealItems)
        return { kind: 'maxItems', max: NUTRITION_LIMITS.mealItems };
      return undefined;
    });
  });

/** Grams are whole numbers between 1 and 2000 (API). */
export const validGrams = (grams: number) =>
  Number.isInteger(grams) &&
  grams >= NUTRITION_LIMITS.grams.min &&
  grams <= NUTRITION_LIMITS.grams.max;

const items = (m: MealFormModel) => m.items.map(({ foodSlug, grams }) => ({ foodSlug, grams }));

export function toCreateMealDto(m: MealFormModel): CreateMealSuggestionDto {
  const description = toOptionalTranslatable(m.description);
  return {
    slug: m.slug,
    name: toTranslatable(m.name),
    ...(description && { description }),
    goal: m.goal,
    mealType: m.mealType,
    isSample: m.isSample,
    sortOrder: m.sortOrder,
    items: items(m),
  };
}

export function toUpdateMealDto(m: MealFormModel): UpdateMealSuggestionDto {
  const description = toOptionalTranslatable(m.description);
  return {
    name: toTranslatable(m.name),
    ...(description && { description }),
    goal: m.goal,
    mealType: m.mealType,
    isSample: m.isSample,
    sortOrder: m.sortOrder,
    items: items(m),
  };
}

// ---------- Guidelines ----------

export interface GuidelineFormModel {
  slug: string;
  title: Translatable;
  summary: Translatable;
  body: Translatable;
  goals: NutritionGoal[];
  sortOrder: number;
}

export function toGuidelineForm(g: AdminGuidelineDto | null): GuidelineFormModel {
  return {
    slug: g?.slug ?? '',
    title: fromTranslatable(g?.title),
    summary: fromTranslatable(g?.summary),
    body: fromTranslatable(g?.body),
    goals: [...(g?.goals ?? [])],
    sortOrder: g?.sortOrder ?? 0,
  };
}

export const guidelineSchema = (isNew: () => boolean) =>
  schema<GuidelineFormModel>((path) => {
    slugRule(path.slug, NUTRITION_LIMITS.slug, isNew);
    translatable(path.title, { required: true, maxLength: NUTRITION_LIMITS.title });
    translatable(path.summary, { required: true, maxLength: NUTRITION_LIMITS.summary });
    translatable(path.body, { required: true, maxLength: NUTRITION_LIMITS.body });
    validate(path.goals, ({ value }) => (value().length ? undefined : { kind: 'required' }));
  });

export const toCreateGuidelineDto = (g: GuidelineFormModel): CreateGuidelineDto => ({
  slug: g.slug,
  title: toTranslatable(g.title),
  summary: toTranslatable(g.summary),
  body: toTranslatable(g.body),
  goals: g.goals,
  sortOrder: g.sortOrder,
});

export const toUpdateGuidelineDto = (g: GuidelineFormModel): UpdateGuidelineDto => ({
  title: toTranslatable(g.title),
  summary: toTranslatable(g.summary),
  body: toTranslatable(g.body),
  goals: g.goals,
  sortOrder: g.sortOrder,
});
