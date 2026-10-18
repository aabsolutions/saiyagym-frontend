import { PlanEntitlementsDto } from '../../api/models/plan-entitlements-dto';
import { buildComparison } from './plan-comparison';

const free: PlanEntitlementsDto = {
  limits: { routines: 3, activePrograms: 1, customExercises: 10 },
  statsHistoryDays: 90,
  features: {
    fullStats: false,
    autoProgression: false,
    progressPhotos: false,
    fullNutrition: false,
    dataExport: false,
  },
};
const premium: PlanEntitlementsDto = {
  limits: { routines: null, activePrograms: null, customExercises: null },
  statsHistoryDays: null,
  features: {
    fullStats: true,
    autoProgression: true,
    progressPhotos: true,
    fullNutrition: true,
    dataExport: true,
  },
};

describe('buildComparison', () => {
  const rows = buildComparison([{ entitlements: free }, { entitlements: premium }]);
  const row = (labelKey: string) => rows.find((r) => r.labelKey === labelKey)?.cells;

  it('has one row per limit, the stats window and every feature', () => {
    expect(rows).toHaveLength(3 + 1 + 5);
  });

  it('reads limits from the entitlements (null = unlimited)', () => {
    expect(row('plans.limits.routines')).toEqual([
      { type: 'limit', value: 3 },
      { type: 'limit', value: null },
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
