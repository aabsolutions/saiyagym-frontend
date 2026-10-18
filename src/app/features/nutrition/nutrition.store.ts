import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  from,
  of,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { CalculatorRequestDto } from '../../api/models/calculator-request-dto';
import { CalculatorResponseDto } from '../../api/models/calculator-response-dto';
import { FoodPageDto } from '../../api/models/food-page-dto';
import { GuidelineListDto } from '../../api/models/guideline-list-dto';
import { MealSuggestionPageDto } from '../../api/models/meal-suggestion-page-dto';
import { NutritionService } from '../../api/services/nutrition.service';
import { FoodCategory, FoodTag, MealType, NutritionGoal } from './nutrition-model';

export const MEALS_PAGE_SIZE = 12;
export const FOODS_PAGE_SIZE = 20;

export type NutritionSection = 'meals' | 'guidelines' | 'foods';

export interface MealFilters {
  goal: NutritionGoal | null;
  mealType: MealType | null;
  page: number;
}

export interface FoodFilters {
  q: string;
  category: FoodCategory | null;
  tags: FoodTag[];
  page: number;
}

interface NutritionState {
  active: Record<NutritionSection, boolean>;
  calculating: boolean;
  result: CalculatorResponseDto | null;
  mealFilters: MealFilters;
  meals: MealSuggestionPageDto | null;
  mealsPending: boolean;
  guidelineGoal: NutritionGoal | null;
  guidelines: GuidelineListDto | null;
  guidelinesPending: boolean;
  foodFilters: FoodFilters;
  foods: FoodPageDto | null;
  foodsPending: boolean;
}

const json = <T>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/** Static guidance, meal suggestions and the calculator. Each tab loads when first shown. */
export const NutritionStore = signalStore(
  withState<NutritionState>({
    active: { meals: false, guidelines: false, foods: false },
    calculating: false,
    result: null,
    mealFilters: { goal: null, mealType: null, page: 1 },
    meals: null,
    mealsPending: false,
    guidelineGoal: null,
    guidelines: null,
    guidelinesPending: false,
    foodFilters: { q: '', category: null, tags: [], page: 1 },
    foods: null,
    foodsPending: false,
  }),
  withProps(() => ({ _api: inject(NutritionService) })),
  withComputed((store) => ({
    mealsRequest: computed(() => {
      if (!store.active().meals) return null;
      const { goal, mealType, page } = store.mealFilters();
      return {
        page,
        limit: MEALS_PAGE_SIZE,
        ...(goal && { goal }),
        ...(mealType && { mealType }),
      };
    }),
    guidelinesRequest: computed(() => {
      if (!store.active().guidelines) return null;
      const goal = store.guidelineGoal();
      return goal ? { goal } : {};
    }),
    foodsRequest: computed(() => {
      if (!store.active().foods) return null;
      const { q, category, tags, page } = store.foodFilters();
      return {
        page,
        limit: FOODS_PAGE_SIZE,
        ...(q.trim() && { q: q.trim() }),
        ...(category && { category }),
        ...(tags.length && { tag: tags }),
      };
    }),
  })),
  withMethods((store) => ({
    _loadMeals: rxMethod<ReturnType<typeof store.mealsRequest>>(
      pipe(
        distinctUntilChanged(json),
        switchMap((request) => {
          if (!request) return of(null);
          patchState(store, { mealsPending: true });
          return from(store._api.nutritionControllerListSuggestions(request)).pipe(
            tap((meals) => patchState(store, { meals, mealsPending: false })),
            catchError(() => {
              patchState(store, { mealsPending: false });
              return of(null);
            }),
          );
        }),
      ),
    ),

    _loadGuidelines: rxMethod<ReturnType<typeof store.guidelinesRequest>>(
      pipe(
        distinctUntilChanged(json),
        switchMap((request) => {
          if (!request) return of(null);
          patchState(store, { guidelinesPending: true });
          return from(store._api.nutritionControllerListGuidelines(request)).pipe(
            tap((guidelines) => patchState(store, { guidelines, guidelinesPending: false })),
            catchError(() => {
              patchState(store, { guidelinesPending: false });
              return of(null);
            }),
          );
        }),
      ),
    ),

    /** Typing in the search box: wait for a pause, never fire per keystroke. */
    _loadFoods: rxMethod<ReturnType<typeof store.foodsRequest>>(
      pipe(
        debounceTime(250),
        distinctUntilChanged(json),
        switchMap((request) => {
          if (!request) return of(null);
          patchState(store, { foodsPending: true });
          return from(store._api.nutritionControllerListFoods(request)).pipe(
            tap((foods) => patchState(store, { foods, foodsPending: false })),
            catchError(() => {
              patchState(store, { foodsPending: false });
              return of(null);
            }),
          );
        }),
      ),
    ),

    activate(section: NutritionSection): void {
      if (!store.active()[section]) {
        patchState(store, (s) => ({ active: { ...s.active, [section]: true } }));
      }
    },

    setMealFilters: (patch: Partial<Omit<MealFilters, 'page'>>) =>
      patchState(store, (s) => ({ mealFilters: { ...s.mealFilters, ...patch, page: 1 } })),
    setMealPage: (page: number) =>
      patchState(store, (s) => ({ mealFilters: { ...s.mealFilters, page } })),
    setGuidelineGoal: (guidelineGoal: NutritionGoal | null) => patchState(store, { guidelineGoal }),
    setFoodFilters: (patch: Partial<Omit<FoodFilters, 'page'>>) =>
      patchState(store, (s) => ({ foodFilters: { ...s.foodFilters, ...patch, page: 1 } })),
    setFoodPage: (page: number) =>
      patchState(store, (s) => ({ foodFilters: { ...s.foodFilters, page } })),

    /** Resolves true with a result; on 400 NUTRITION_PROFILE_INCOMPLETE the snackbar says what's missing. */
    async calculate(body: CalculatorRequestDto): Promise<boolean> {
      patchState(store, { calculating: true });
      try {
        const result = await store._api.nutritionControllerCalculate({ body });
        patchState(store, { result });
        return true;
      } catch {
        return false;
      } finally {
        patchState(store, { calculating: false });
      }
    },
  })),
  withHooks({
    onInit(store) {
      store._loadMeals(store.mealsRequest);
      store._loadGuidelines(store.guidelinesRequest);
      store._loadFoods(store.foodsRequest);
    },
  }),
);

export type NutritionStore = InstanceType<typeof NutritionStore>;
