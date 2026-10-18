import {
  activeFilterCount,
  emptyFilters,
  filtersFromParams,
  filtersToParams,
  pageFromParams,
  toListParams,
} from './exercise-filters';

describe('exercise filters', () => {
  it('round-trips through the query string', () => {
    const filters = {
      ...emptyFilters('hypertrophy'),
      q: 'press',
      muscle: 'chest' as const,
      tier: 'S' as const,
      goal: 'powerlifting' as const,
      favorites: true,
    };
    const params = filtersToParams(filters, 3, 50, 'hypertrophy');
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null));
    expect(clean).toEqual({
      q: 'press',
      muscle: 'chest',
      tier: 'S',
      goal: 'powerlifting',
      favorites: '1',
      page: 3,
      limit: 50,
    });
    expect(filtersFromParams(clean, 'hypertrophy')).toEqual(filters);
    expect(pageFromParams({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('keeps default values out of the URL', () => {
    const params = filtersToParams(emptyFilters('hypertrophy'), 1, 20, 'hypertrophy');
    expect(Object.values(params).every((v) => v === null)).toBe(true);
  });

  it('drops invalid values from a hand-edited URL', () => {
    const filters = filtersFromParams(
      { muscle: 'wings', tier: 'Z', goal: 'cardio', favorites: 'yes' },
      'powerlifting',
    );
    expect(filters).toEqual(emptyFilters('powerlifting'));
    expect(pageFromParams({ page: '-2', limit: '7' })).toEqual({ page: 1, limit: 20 });
  });

  it('only sends `goal` together with `tier` (the API requires it then)', () => {
    const noTier = toListParams({ ...emptyFilters('powerlifting') }, 1, 20);
    expect(noTier).toEqual({ sort: 'name', page: 1, limit: 20 });

    const withTier = toListParams({ ...emptyFilters('powerlifting'), tier: 'A' }, 1, 20);
    expect(withTier).toMatchObject({ tier: 'A', goal: 'powerlifting' });
  });

  it('sorts by relevance only while searching', () => {
    expect(toListParams({ ...emptyFilters('hypertrophy'), q: '  curl ' }, 1, 20)).toMatchObject({
      q: 'curl',
      sort: 'relevance',
    });
  });

  it('counts active filters (search and goal are not filters)', () => {
    expect(
      activeFilterCount({ ...emptyFilters('hypertrophy'), q: 'x', goal: 'powerlifting' }),
    ).toBe(0);
    expect(
      activeFilterCount({ ...emptyFilters('hypertrophy'), muscle: 'quads', custom: true }),
    ).toBe(2);
  });
});
