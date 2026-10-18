import type { BarSeriesOption, HeatmapSeriesOption, LineSeriesOption } from 'echarts/charts';
import type {
  AriaComponentOption,
  CalendarComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';
import { fromIso } from '../format/local-dates';
import { ChartTokens } from './chart-palette';

/** Only the option types of what echarts-setup.ts registers. */
export type ChartOption = ComposeOption<
  | BarSeriesOption
  | HeatmapSeriesOption
  | LineSeriesOption
  | AriaComponentOption
  | CalendarComponentOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
>;

const FONT = 'Roboto, system-ui, -apple-system, "Segoe UI", sans-serif';

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) numberFormats.set(key, (format = new Intl.NumberFormat(locale, options)));
  return format;
}

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) dateFormats.set(key, (format = new Intl.DateTimeFormat(locale, options)));
  return format;
}

/** Axis ticks: 950 · 1,2 K · 12 K. */
export const compactNumber = (value: number, locale: string): string =>
  numberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export const plainNumber = (value: number, locale: string, digits = 1): string =>
  numberFormat(locale, { maximumFractionDigits: digits }).format(value);

/** Local `YYYY-MM-DD` (or a timestamp) → "5 oct". */
export const shortDate = (date: string | number, locale: string): string =>
  dateFormat(locale, { day: 'numeric', month: 'short' }).format(
    typeof date === 'string' ? fromIso(date) : new Date(date),
  );

export const mediumDate = (date: string | number, locale: string): string =>
  dateFormat(locale, { dateStyle: 'medium' }).format(
    typeof date === 'string' ? fromIso(date) : new Date(date),
  );

/** Local `YYYY-MM-DD` → its local-midnight timestamp (time axes). */
export const localDay = (iso: string): number => fromIso(iso).getTime();

/** Names in tooltips come from the API (custom exercise names): never inject them raw. */
export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

export interface TooltipRow {
  color: string;
  name: string;
  value: string;
}

/** Value leads (strong), the series name follows; a short line key, never a box. */
export function tooltipHtml(title: string, rows: TooltipRow[], t: ChartTokens): string {
  const body = rows
    .map(
      (row) =>
        `<div style="display:flex;align-items:center;gap:8px;margin-top:4px">` +
        `<span style="display:inline-block;width:12px;height:2px;border-radius:1px;background:${row.color}"></span>` +
        `<strong style="color:${t.textPrimary}">${escapeHtml(row.value)}</strong>` +
        `<span style="color:${t.textSecondary}">${escapeHtml(row.name)}</span></div>`,
    )
    .join('');
  return `<div style="color:${t.textSecondary};font-size:12px">${escapeHtml(title)}</div>${body}`;
}

export function baseOption(t: ChartTokens): ChartOption {
  return {
    backgroundColor: 'transparent',
    animationDuration: 300,
    textStyle: { fontFamily: FONT, color: t.textSecondary },
    aria: { enabled: true },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: tooltip(t),
  };
}

export function tooltip(t: ChartTokens, trigger: 'axis' | 'item' = 'axis'): TooltipComponentOption {
  return {
    trigger,
    confine: true,
    backgroundColor: t.tooltipBackground,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { fontFamily: FONT, color: t.textPrimary, fontSize: 12 },
    extraCssText: 'box-shadow:none;border-radius:8px',
    axisPointer: { type: 'line', lineStyle: { color: t.axis, width: 1, type: 'solid' } },
  };
}

/** Only for ≥ 2 series (a single series is named by the card title). */
export function legend(t: ChartTokens, kind: 'line' | 'bar'): LegendComponentOption {
  return {
    top: 0,
    left: 0,
    icon: kind === 'line' ? 'roundRect' : 'rect',
    itemWidth: kind === 'line' ? 14 : 10,
    itemHeight: kind === 'line' ? 3 : 10,
    itemGap: 16,
    textStyle: { color: t.textSecondary, fontFamily: FONT, fontSize: 12 },
    inactiveColor: t.axis,
  };
}

export function timeAxis(t: ChartTokens, locale: string) {
  return {
    type: 'time' as const,
    axisLine: { lineStyle: { color: t.axis, width: 1 } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: {
      color: t.muted,
      hideOverlap: true,
      formatter: (value: number) => shortDate(value, locale),
    },
  };
}

export function categoryAxis(t: ChartTokens, data: string[], label: (value: string) => string) {
  return {
    type: 'category' as const,
    data,
    axisLine: { lineStyle: { color: t.axis, width: 1 } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { color: t.muted, hideOverlap: true, formatter: label },
  };
}

/**
 * `zeroBased` for bars (they grow from the baseline); lines may zoom into their range.
 * The unit goes in the axis name, so ticks stay short.
 */
export function valueAxis(
  t: ChartTokens,
  locale: string,
  options: { unit?: string; zeroBased?: boolean } = {},
) {
  return {
    type: 'value' as const,
    scale: !options.zeroBased,
    name: options.unit,
    nameTextStyle: { color: t.muted, align: 'left' as const },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: t.muted, formatter: (value: number) => compactNumber(value, locale) },
    splitLine: { lineStyle: { color: t.grid, width: 1, type: 'solid' as const } },
  };
}

export function lineSeries(
  t: ChartTokens,
  name: string,
  color: string,
  data: (number | null)[][],
  options: { area?: boolean; endLabel?: (value: number) => string } = {},
): LineSeriesOption {
  return {
    type: 'line',
    name,
    data,
    connectNulls: true,
    symbol: 'circle',
    symbolSize: 8,
    // Markers only while they don't crowd the line; the crosshair still finds every point.
    showSymbol: data.length <= 40,
    lineStyle: { width: 2, color, cap: 'round', join: 'round' },
    itemStyle: { color, borderColor: t.surface, borderWidth: 2 },
    emphasis: { focus: 'series' },
    ...(options.area && { areaStyle: { color, opacity: 0.1 } }),
    ...(options.endLabel && {
      endLabel: {
        show: true,
        color: t.textSecondary,
        formatter: (p: { value: unknown }) => {
          const value = Array.isArray(p.value) ? p.value[1] : p.value;
          return typeof value === 'number' ? options.endLabel!(value) : '';
        },
      },
    }),
  };
}

export function barSeries(
  name: string,
  color: string,
  data: NonNullable<BarSeriesOption['data']>,
): BarSeriesOption {
  return {
    type: 'bar',
    name,
    data,
    barMaxWidth: 24,
    barGap: '10%',
    itemStyle: { color, borderRadius: [4, 4, 0, 0] },
    emphasis: { focus: 'series' },
  };
}
