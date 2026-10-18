import { SeriesPointDto } from '../../api/models/series-point-dto';
import {
  ChartOption,
  baseOption,
  lineSeries,
  mediumDate,
  plainNumber,
  timeAxis,
  tooltip,
  tooltipHtml,
  valueAxis,
} from '../../shared/charts/chart-options';
import { ChartContext, lengthIn, weightIn } from '../../shared/charts/chart-theme';
import { MeasurementField, kindOf } from './measurements-model';

export function measurementUnit(ctx: ChartContext, field: MeasurementField): string {
  const kind = kindOf(field);
  return kind === 'weight' ? ctx.weightUnit : kind === 'length' ? ctx.lengthUnit : '%';
}

export function measurementValue(ctx: ChartContext, field: MeasurementField, stored: number) {
  const kind = kindOf(field);
  return kind === 'weight'
    ? weightIn(ctx, stored)
    : kind === 'length'
      ? lengthIn(ctx, stored)
      : stored;
}

/**
 * One measurement over time: a single series (the card title names it, so no legend).
 * `compact` is the dashboard's mini chart: same data, less chrome.
 */
export function measurementOption(
  ctx: ChartContext,
  field: MeasurementField,
  points: SeriesPointDto[],
  options: { compact?: boolean } = {},
): ChartOption {
  const { t, locale } = ctx;
  const unit = measurementUnit(ctx, field);
  const format = (v: number) => `${plainNumber(v, locale)} ${unit}`;
  const name = ctx.translate(`body.fields.${field}`);
  const data = points.map((p) => [
    new Date(p.measuredAt).getTime(),
    measurementValue(ctx, field, p.value),
  ]);
  return {
    ...baseOption(t),
    grid: options.compact
      ? { left: 4, right: 56, top: 8, bottom: 4, containLabel: true }
      : { left: 8, right: 72, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltip(t),
      formatter: (raw: unknown) => {
        const p = (Array.isArray(raw) ? raw[0] : raw) as { value: [number, number]; color: string };
        if (!p) return '';
        return tooltipHtml(
          mediumDate(p.value[0], locale),
          [{ color: p.color, name, value: format(p.value[1]) }],
          t,
        );
      },
    },
    xAxis: timeAxis(t, locale),
    yAxis: {
      ...valueAxis(t, locale, { unit: options.compact ? undefined : unit }),
      ...(options.compact && { splitNumber: 2 }),
    },
    series: [lineSeries(t, name, t.categorical[0], data, { area: true, endLabel: format })],
  };
}
