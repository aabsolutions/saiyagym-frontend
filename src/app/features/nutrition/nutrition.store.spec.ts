import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NutritionStore } from './nutrition.store';

const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const page = { items: [], meta: { page: 1, limit: 12, total: 0 } };

describe('NutritionStore', () => {
  let httpMock: HttpTestingController;
  let store: NutritionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NutritionStore],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(NutritionStore);
  });

  afterEach(() => httpMock.verify());

  it('a tab loads when first shown; changing a filter goes back to page 1', async () => {
    TestBed.tick();
    expect(httpMock.match(() => true)).toHaveLength(0);

    store.activate('meals');
    TestBed.tick();
    httpMock
      .expectOne((r) => r.url === '/api/v1/nutrition/meal-suggestions')
      .flush({ ...page, disclaimer: 'd', limitedByPlan: true, lockedCount: 7 });
    await settle();
    expect(store.meals()?.lockedCount).toBe(7);

    store.setMealPage(2);
    store.setMealFilters({ goal: 'cut' });
    TestBed.tick();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/nutrition/meal-suggestions');
    expect(req.request.params.get('goal')).toBe('cut');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ ...page, disclaimer: 'd', limitedByPlan: false, lockedCount: 0 });
  });

  it('the food search waits for a pause in typing', async () => {
    store.activate('foods');
    store.setFoodFilters({ q: 'a' });
    TestBed.tick();
    store.setFoodFilters({ q: 'av' });
    TestBed.tick();
    store.setFoodFilters({ q: 'avena', tags: ['vegan'] });
    TestBed.tick();
    await settle(300);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/nutrition/foods');
    expect(req.request.params.get('q')).toBe('avena');
    expect(req.request.params.getAll('tag')).toEqual(['vegan']);
    req.flush({ ...page, limit: 20 });
  });
});
