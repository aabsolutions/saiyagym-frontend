import { BodyMetricDto } from '../../api/models/body-metric-dto';
import { BodyMetricSeriesDto } from '../../api/models/body-metric-series-dto';
import { CreateBodyMetricDto } from '../../api/models/create-body-metric-dto';
import { UpdateBodyMetricDto } from '../../api/models/update-body-metric-dto';
import { fromIso, todayIso } from '../../shared/format/local-dates';
import { UnitSystem, cmToIn, inToCm, kgToLb, lbToKg } from '../../shared/units/units';

export type MeasurementField = BodyMetricSeriesDto['metric'];
export type MeasureKind = 'weight' | 'percent' | 'length';

/** Display order (same as the API's MEASUREMENT_FIELDS). */
export const MEASUREMENT_FIELDS: readonly MeasurementField[] = [
  'weightKg',
  'bodyFatPercent',
  'waistCm',
  'chestCm',
  'hipsCm',
  'armCm',
  'thighCm',
  'calfCm',
  'neckCm',
];

export const isMeasurementField = (value: unknown): value is MeasurementField =>
  (MEASUREMENT_FIELDS as readonly unknown[]).includes(value);

export const kindOf = (field: MeasurementField): MeasureKind =>
  field === 'weightKg' ? 'weight' : field === 'bodyFatPercent' ? 'percent' : 'length';

/** API bounds (BodyMetricBodyDto), in kg / % / cm. */
const BOUNDS: Record<MeasurementField, { min: number; max: number }> = {
  weightKg: { min: 20, max: 400 },
  bodyFatPercent: { min: 2, max: 75 },
  waistCm: { min: 30, max: 250 },
  chestCm: { min: 40, max: 250 },
  hipsCm: { min: 40, max: 250 },
  armCm: { min: 10, max: 80 },
  thighCm: { min: 20, max: 120 },
  calfCm: { min: 15, max: 80 },
  neckCm: { min: 20, max: 80 },
};

export const NOTES_MAX = 1000;

const round = (value: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

/** Stored (kg / % / cm) → the user's unit. */
export function toDisplay(field: MeasurementField, stored: number, units: UnitSystem): number {
  if (units === 'metric') return stored;
  const kind = kindOf(field);
  return kind === 'weight' ? kgToLb(stored) : kind === 'length' ? cmToIn(stored) : stored;
}

/** The user's unit → stored, at the API's precision (2 decimals). */
export function toStored(field: MeasurementField, display: number, units: UnitSystem): number {
  if (units === 'metric') return round(display, 2);
  const kind = kindOf(field);
  const stored =
    kind === 'weight' ? lbToKg(display) : kind === 'length' ? inToCm(display) : display;
  return round(stored, 2);
}

/** What the inputs show: one decimal, like every other unit-aware field. */
const shown = (field: MeasurementField, stored: number, units: UnitSystem) =>
  round(toDisplay(field, stored, units), 1);

export function boundsIn(field: MeasurementField, units: UnitSystem): { min: number; max: number } {
  const { min, max } = BOUNDS[field];
  return {
    min: round(toDisplay(field, min, units), 1),
    max: round(toDisplay(field, max, units), 1),
  };
}

export type MeasurementValues = Record<MeasurementField, number | null>;

/** `date` is the native date input's local `YYYY-MM-DD`. */
export interface MeasurementFormModel {
  date: string;
  values: MeasurementValues;
  notes: string;
}

const emptyValues = (): MeasurementValues =>
  Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, null])) as MeasurementValues;

/** Local day of a stored instant, in this browser's zone. */
export function localDayOf(iso: string): string {
  return todayIso(new Date(iso));
}

export function toFormModel(metric: BodyMetricDto | null, units: UnitSystem): MeasurementFormModel {
  if (!metric) return { date: todayIso(), values: emptyValues(), notes: '' };
  const values = emptyValues();
  for (const field of MEASUREMENT_FIELDS) {
    const stored = metric[field];
    values[field] = stored === null ? null : shown(field, stored, units);
  }
  return { date: localDayOf(metric.measuredAt), values, notes: metric.notes };
}

const isSet = (value: number | null): value is number => value !== null && !Number.isNaN(value);

export const hasAnyMeasurement = (values: MeasurementValues): boolean =>
  MEASUREMENT_FIELDS.some((f) => isSet(values[f]));

/** Today → now; another day → that day at local noon (safe from DST edges). */
export function measuredAtFor(date: string, now = new Date()): string {
  if (date === todayIso(now)) return now.toISOString();
  const day = fromIso(date);
  day.setHours(12);
  return day.toISOString();
}

export function toCreateDto(
  model: MeasurementFormModel,
  units: UnitSystem,
  id: string,
  now = new Date(),
): CreateBodyMetricDto {
  const dto: CreateBodyMetricDto = { id, measuredAt: measuredAtFor(model.date, now) };
  for (const field of MEASUREMENT_FIELDS) {
    const value = model.values[field];
    if (isSet(value)) dto[field] = toStored(field, value, units);
  }
  const notes = model.notes.trim();
  if (notes) dto.notes = notes;
  return dto;
}

/**
 * Only what changed. An untouched value is never re-converted (lb → kg → lb would drift);
 * a cleared one is sent as `null`. The date only moves if the user picked another day.
 */
export function toUpdateDto(
  model: MeasurementFormModel,
  units: UnitSystem,
  stored: BodyMetricDto,
  now = new Date(),
): UpdateBodyMetricDto {
  const dto: UpdateBodyMetricDto = {};
  if (model.date !== localDayOf(stored.measuredAt)) dto.measuredAt = measuredAtFor(model.date, now);
  for (const field of MEASUREMENT_FIELDS) {
    const value = model.values[field];
    const before = stored[field];
    if (!isSet(value)) {
      if (before !== null) dto[field] = null;
    } else if (before === null || shown(field, before, units) !== value) {
      dto[field] = toStored(field, value, units);
    }
  }
  const notes = model.notes.trim();
  if (notes !== stored.notes) dto.notes = notes;
  return dto;
}
