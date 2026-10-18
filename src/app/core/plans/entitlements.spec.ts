import { HttpErrorResponse } from '@angular/common/http';
import { planRestrictionOf } from './entitlements';

const apiError = (error: object) => new HttpErrorResponse({ status: 403, error });

describe('planRestrictionOf', () => {
  it('reads PLAN_FEATURE_REQUIRED', () => {
    expect(
      planRestrictionOf(
        apiError({ code: 'PLAN_FEATURE_REQUIRED', details: { feature: 'progressPhotos' } }),
      ),
    ).toEqual({ kind: 'feature', feature: 'progressPhotos' });
  });

  it('reads PLAN_LIMIT_REACHED', () => {
    expect(
      planRestrictionOf(
        apiError({
          code: 'PLAN_LIMIT_REACHED',
          details: { resource: 'routines', limit: 3, current: 3, requested: 1 },
        }),
      ),
    ).toEqual({ kind: 'limit', resource: 'routines', limit: 3 });
  });

  it('tolerates unknown or missing details', () => {
    expect(
      planRestrictionOf(apiError({ code: 'PLAN_FEATURE_REQUIRED', details: { feature: 'x' } })),
    ).toEqual({ kind: 'feature', feature: null });
    expect(planRestrictionOf(apiError({ code: 'PLAN_LIMIT_REACHED' }))).toEqual({
      kind: 'limit',
      resource: null,
      limit: null,
    });
  });

  it('ignores every other error', () => {
    expect(planRestrictionOf(apiError({ code: 'FORBIDDEN' }))).toBeNull();
    expect(planRestrictionOf(new Error('x'))).toBeNull();
  });
});
