import { PlanEntitlementsDto } from '../../api/models/plan-entitlements-dto';
import { buildComparison } from './plan-comparison';

const free: PlanEntitlementsDto = {
  limits: { routines: 3, activePrograms: 1, customExercises: 10 },
  statsHistoryDays: 90,
  guidesPerRoutine: 5,
  features: {
    fullStats: false,
    autoProgression: false,
    progressPhotos: false,
    fullNutrition: false,
    dataExport: false,
    premiumSounds: false,
  },
};
const premium: PlanEntitlementsDto = {
  limits: { routines: null, activePrograms: null, customExercises: null },
  statsHistoryDays: null,
  guidesPerRoutine: null,
  features: {
    fullStats: true,
    autoProgression: true,
    progressPhotos: true,
    fullNutrition: true,
    dataExport: true,
    premiumSounds: true,
  },
};

describe('buildComparison', () => {
  const rows = buildComparison([{ entitlements: free }, { entitlements: premium }]);
  const row = (labelKey: string) => rows.find((r) => r.labelKey === labelKey)?.cells;

  it('has one row per limit, the stats window, guides per routine and every feature', () => {
    expect(rows).toHaveLength(3 + 1 + 1 + 6);
  });

  it('guides per routine reads as a limit (null = unlimited)', () => {
    expect(row('plans.guidesPerRoutine')).toEqual([
      { type: 'limit', value: 5 },
      { type: 'limit', value: null },
    ]);
  });

  it('reads limits from the entitlements (null = unlimited)', () => {
    expect(row('plans.limits.routines')).toEqual([
      { type: 'limit', value: 3 },
      { type: 'limit', value: null },
    ]);
  });

  it('has a row for the premium sounds feature', () => {
    expect(row('plans.features.premiumSounds')).toEqual([
      { type: 'included', value: false },
      { type: 'included', value: true },
    ]);
  });

  it('reads the stats window and features', () => {
    expect(row('plans.statsHistory')).toEqual([
      { type: 'history', days: 90 },
      { type: 'history', days: null },
    ]);
    expect(row('plans.features.progressPhotos')).toEqual([
      { type: 'included', value: false },
      { type: 'included', value: true },
    ]);
  });
});
