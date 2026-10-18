import { BodyMetricDto } from '../../api/models/body-metric-dto';
import { kgToLb } from '../../shared/units/units';
import {
  boundsIn,
  hasAnyMeasurement,
  measuredAtFor,
  toCreateDto,
  toFormModel,
  toUpdateDto,
} from './measurements-model';

const stored = (patch: Partial<BodyMetricDto> = {}): BodyMetricDto => ({
  id: 'm1',
  measuredAt: new Date(2026, 9, 10, 8).toISOString(),
  weightKg: 82.35,
  bodyFatPercent: 18,
  waistCm: 84,
  chestCm: null,
  hipsCm: null,
  armCm: null,
  thighCm: null,
  calfCm: null,
  neckCm: null,
  notes: '',
  updatedAt: '2026-10-10T08:00:00.000Z',
  ...patch,
});

describe('measurements model', () => {
  const now = new Date(2026, 9, 18, 9, 30);

  it('creates in kg/cm from imperial input, only with what was filled', () => {
    const model = toFormModel(null, 'imperial');
    model.values.weightKg = 180;
    model.values.waistCm = 33;
    const dto = toCreateDto(model, 'imperial', 'id-1', now);
    expect(dto.weightKg).toBeCloseTo(81.65, 2);
    expect(dto.waistCm).toBeCloseTo(83.82, 2);
    expect(dto).not.toHaveProperty('chestCm');
    expect(dto.id).toBe('id-1');
  });

  it('today keeps the time; another day goes to local noon', () => {
    expect(measuredAtFor('2026-10-18', now)).toBe(now.toISOString());
    expect(measuredAtFor('2026-10-15', now)).toBe(new Date(2026, 9, 15, 12).toISOString());
  });

  it('an untouched imperial value is NOT re-sent (no lb → kg drift)', () => {
    const metric = stored();
    const model = toFormModel(metric, 'imperial');
    expect(model.values.weightKg).toBeCloseTo(Math.round(kgToLb(82.35) * 10) / 10);
    expect(toUpdateDto(model, 'imperial', metric, now)).toEqual({});
  });

  it('sends only what changed: edits, clears (null) and a new day', () => {
    const metric = stored();
    const model = toFormModel(metric, 'metric');
    model.values.waistCm = 83;
    model.values.bodyFatPercent = null;
    model.date = '2026-10-11';
    model.notes = ' after holidays ';
    expect(toUpdateDto(model, 'metric', metric, now)).toEqual({
      waistCm: 83,
      bodyFatPercent: null,
      measuredAt: new Date(2026, 9, 11, 12).toISOString(),
      notes: 'after holidays',
    });
  });

  it('bounds follow the unit', () => {
    expect(boundsIn('weightKg', 'metric')).toEqual({ min: 20, max: 400 });
    expect(boundsIn('weightKg', 'imperial').max).toBeCloseTo(881.8, 1);
    expect(boundsIn('bodyFatPercent', 'imperial')).toEqual({ min: 2, max: 75 });
  });

  it('needs at least one measurement', () => {
    const empty = toFormModel(null, 'metric');
    expect(hasAnyMeasurement(empty.values)).toBe(false);
    empty.values.neckCm = 38;
    expect(hasAnyMeasurement(empty.values)).toBe(true);
  });
});
