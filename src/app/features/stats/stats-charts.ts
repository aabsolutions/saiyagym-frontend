import { AdherenceWeekDto } from '../../api/models/adherence-week-dto';
import { ExerciseStatPointDto } from '../../api/models/exercise-stat-point-dto';
import { FrequencyDto } from '../../api/models/frequency-dto';
import { MuscleVolumeRowDto } from '../../api/models/muscle-volume-row-dto';
import { TotalPointDto } from '../../api/models/total-point-dto';
import {
  ChartOption,
  baseOption,
  barSeries,
  categoryAxis,
  legend,
  lineSeries,
  localDay,
  mediumDate,
  plainNumber,
  shortDate,
  timeAxis,
  tooltip,
  tooltipHtml,
  valueAxis,
} from '../../shared/charts/chart-options';
import { ChartContext, weightIn } from '../../shared/charts/chart-theme';
import { addDaysIso } from '../../shared/format/local-dates';

export type MuscleMetric = 'sets' | 'volume';
export type TotalMetric = 'e1rm' | 'max_weight';

/** Max muscles on the grouped bars (each takes a palette slot; the API may return 19). */
export const MAX_MUSCLES = 6;

interface AxisParam {
  axisValue: number | string;
  seriesName: string;
  color: string;
  value: unknown;
}

const yOf = (value: unknown): number | null => {
  const y = Array.isArray(value) ? value[1] : value;
  return typeof y === 'number' ? y : null;
};

const fmtWeight = (ctx: ChartContext, value: number) =>
  `${plainNumber(value, ctx.locale)} ${ctx.weightUnit}`;

/** One tooltip, every series at that X; values in the user's unit. */
function axisTooltip(
  ctx: ChartContext,
  title: (axisValue: number | string) => string,
  value: (series: string, y: number) => string,
) {
  return {
    ...tooltip(ctx.t),
    formatter: (raw: unknown) => {
      const params = (Array.isArray(raw) ? raw : [raw]) as AxisParam[];
      if (!params.length) return '';
      const rows = params.flatMap((p) => {
        const y = yOf(p.value);
        return y === null
          ? []
          : [{ color: p.color, name: p.seriesName, value: value(p.seriesName, y) }];
      });
      return tooltipHtml(title(params[0].axisValue), rows, ctx.t);
    },
  };
}

// ---------- Exercise evolution ----------

/** Max weight and best e1RM share a unit and a scale: one axis, two lines. */
export function exerciseStrengthOption(
  ctx: ChartContext,
  points: ExerciseStatPointDto[],
): ChartOption {
  const { t, locale } = ctx;
  const maxName = ctx.translate('stats.exercise.maxWeight');
  const e1rmName = ctx.translate('stats.exercise.e1rm');
  const end = (v: number) => fmtWeight(ctx, v);
  return {
    ...baseOption(t),
    legend: legend(t, 'line'),
    grid: { left: 8, right: 72, top: 40, bottom: 8, containLabel: true },
    tooltip: axisTooltip(
      ctx,
      (x) => mediumDate(Number(x), locale),
      (_, y) => fmtWeight(ctx, y),
    ),
    xAxis: timeAxis(t, locale),
    yAxis: valueAxis(t, locale, { unit: ctx.weightUnit }),
    series: [
      lineSeries(
        t,
        maxName,
        t.categorical[0],
        points.map((p) => [localDay(p.date), weightIn(ctx, p.maxWeightKg)]),
        { endLabel: end },
      ),
      lineSeries(
        t,
        e1rmName,
        t.categorical[1],
        points.map((p) => [
          localDay(p.date),
          p.bestE1RM === null ? null : weightIn(ctx, p.bestE1RM),
        ]),
        { endLabel: end },
      ),
    ],
  };
}

/** Volume lives on another scale: its own chart, never a second axis. */
export function exerciseVolumeOption(
  ctx: ChartContext,
  points: ExerciseStatPointDto[],
): ChartOption {
  const { t, locale } = ctx;
  const name = ctx.translate('stats.exercise.volume');
  return {
    ...baseOption(t),
    tooltip: axisTooltip(
      ctx,
      (x) => mediumDate(Number(x), locale),
      (_, y) => fmtWeight(ctx, y),
    ),
    xAxis: timeAxis(t, locale),
    yAxis: valueAxis(t, locale, { unit: ctx.weightUnit, zeroBased: true }),
    series: [
      barSeries(
        name,
        t.categorical[0],
        points.map((p) => [localDay(p.date), weightIn(ctx, p.volumeKg)]),
      ),
    ],
  };
}

// ---------- Muscle volume ----------

/** Weeks in order (the API sends rows only for weeks with data: gaps stay visible as 0). */
export function weeksOf(rows: MuscleVolumeRowDto[]): string[] {
  const present = [...new Set(rows.map((r) => r.week))].sort();
  if (present.length < 2) return present;
  const weeks: string[] = [];
  for (let w = present[0]; w <= present[present.length - 1]; w = addDaysIso(w, 7)) weeks.push(w);
  return weeks;
}

/** Muscles ranked by total working sets (the default selection). */
export function topMuscles(rows: MuscleVolumeRowDto[], count: number): string[] {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.muscle, (totals.get(r.muscle) ?? 0) + r.sets);
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([muscle]) => muscle);
}

/**
 * Slot-stable selection: a muscle keeps its slot (and color) while others come and go.
 * `slots[i]` is the muscle painted with palette slot i, or null if that slot is free.
 */
export function toggleMuscleSlot(slots: (string | null)[], muscle: string): (string | null)[] {
  const index = slots.indexOf(muscle);
  if (index >= 0) {
    const next = slots.slice();
    next[index] = null;
    while (next.length && next[next.length - 1] === null) next.pop();
    return next;
  }
  const free = slots.indexOf(null);
  if (free >= 0) return slots.map((m, i) => (i === free ? muscle : m));
  return slots.length < MAX_MUSCLES ? [...slots, muscle] : slots;
}

const muscleLabel = (ctx: ChartContext, muscle: string) =>
  ctx.translate(`exercises.muscles.${muscle}`);

export function muscleVolumeOption(
  ctx: ChartContext,
  rows: MuscleVolumeRowDto[],
  slots: (string | null)[],
  metric: MuscleMetric,
): ChartOption {
  const { t, locale } = ctx;
  const weeks = weeksOf(rows);
  const byKey = new Map(rows.map((r) => [`${r.week}|${r.muscle}`, r]));
  const valueOf = (r: MuscleVolumeRowDto | undefined) =>
    !r ? 0 : metric === 'sets' ? r.sets : weightIn(ctx, r.volumeKg);
  const format = (_: string, y: number) =>
    metric === 'sets'
      ? ctx.translate('stats.volume.setsN', { n: plainNumber(y, locale, 0) })
      : fmtWeight(ctx, y);
  const weekTitle = (w: string | number) =>
    ctx.translate('stats.volume.weekOf', { date: mediumDate(String(w), locale) });

  return {
    ...baseOption(t),
    legend: legend(t, 'bar'),
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    tooltip: { ...axisTooltip(ctx, weekTitle, format), axisPointer: { type: 'shadow' } },
    xAxis: categoryAxis(t, weeks, (w) => shortDate(w, locale)),
    yAxis: valueAxis(t, locale, {
      unit: metric === 'sets' ? ctx.translate('stats.volume.setsUnit') : ctx.weightUnit,
      zeroBased: true,
    }),
    series: slots.flatMap((muscle, slot) =>
      muscle === null
        ? []
        : [
            barSeries(
              muscleLabel(ctx, muscle),
              t.categorical[slot],
              weeks.map((w) => valueOf(byKey.get(`${w}|${muscle}`))),
            ),
          ],
    ),
  };
}

// ---------- Frequency heatmap ----------

/** Quartile cut points of the user's own training days, so the four bins are always used. */
export function volumeBins(values: number[]): number[] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return [...new Set([q(0.25), q(0.5), q(0.75)])];
}

const monthNames = (locale: string) =>
  Array.from({ length: 12 }, (_, m) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2026, m, 1)),
  );

const dayNames = (locale: string) =>
  // 2026-03-01 is a Sunday: echarts wants Sunday first.
  Array.from({ length: 7 }, (_, d) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2026, 2, 1 + d)),
  );

export function frequencyHeatmapOption(
  ctx: ChartContext,
  frequency: FrequencyDto,
  firstDayOfWeek: number,
): ChartOption {
  const { t, locale } = ctx;
  const values = frequency.heatmap.map((d) => weightIn(ctx, d.volumeKg));
  const cuts = volumeBins(values);
  const edges = [0, ...cuts];
  const pieces = edges.map((min, i) => ({
    min: i === 0 ? 0 : min,
    ...(i < edges.length - 1 && { max: edges[i + 1] }),
    color: t.ordinal[Math.min(t.ordinal.length - 1, i + (t.ordinal.length - edges.length))],
  }));
  const sessionsByDate = new Map(frequency.heatmap.map((d) => [d.date, d.sessions]));

  return {
    ...baseOption(t),
    tooltip: {
      ...tooltip(t, 'item'),
      formatter: (raw: unknown) => {
        const p = raw as { value: [string, number]; color: string };
        const [date, volume] = p.value;
        const sessions = sessionsByDate.get(date) ?? 0;
        return tooltipHtml(
          mediumDate(date, locale),
          [
            {
              color: p.color,
              name: ctx.translate('stats.frequency.volume'),
              value: fmtWeight(ctx, volume),
            },
            {
              color: p.color,
              name: ctx.translate('stats.frequency.sessions'),
              value: String(sessions),
            },
          ],
          t,
        );
      },
    },
    visualMap: {
      type: 'piecewise',
      show: false,
      dimension: 1,
      pieces,
    },
    calendar: {
      range: String(frequency.year),
      top: 24,
      left: 32,
      right: 8,
      cellSize: ['auto', 14],
      // The 2px gap between cells is the surface showing through.
      itemStyle: { color: t.empty, borderColor: t.surface, borderWidth: 2 },
      splitLine: { show: false },
      dayLabel: {
        firstDay: firstDayOfWeek % 7,
        nameMap: dayNames(locale),
        color: t.muted,
        fontSize: 10,
      },
      monthLabel: { nameMap: monthNames(locale), color: t.muted, fontSize: 11 },
      yearLabel: { show: false },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: frequency.heatmap.map((d, i) => [d.date, values[i]]),
        emphasis: { itemStyle: { borderColor: t.textPrimary, borderWidth: 1 } },
      },
    ],
  };
}

// ---------- Powerlifting total ----------

export function powerliftingOption(ctx: ChartContext, points: TotalPointDto[]): ChartOption {
  const { t, locale } = ctx;
  const lifts = [
    { key: 'total', slot: 0 },
    { key: 'squat', slot: 1 },
    { key: 'bench', slot: 2 },
    { key: 'deadlift', slot: 3 },
  ] as const;
  const end = (v: number) => fmtWeight(ctx, v);
  return {
    ...baseOption(t),
    legend: legend(t, 'line'),
    grid: { left: 8, right: 72, top: 40, bottom: 8, containLabel: true },
    tooltip: axisTooltip(
      ctx,
      (x) => ctx.translate('stats.volume.weekOf', { date: mediumDate(Number(x), locale) }),
      (_, y) => fmtWeight(ctx, y),
    ),
    xAxis: timeAxis(t, locale),
    yAxis: valueAxis(t, locale, { unit: ctx.weightUnit }),
    series: lifts.map(({ key, slot }) => ({
      ...lineSeries(
        t,
        ctx.translate(`stats.powerlifting.${key}`),
        t.categorical[slot],
        points.map((p) => {
          const kg = p[key];
          return [localDay(p.weekStart), kg === null ? null : weightIn(ctx, kg)];
        }),
        { endLabel: end },
      ),
      // A running best only moves up in steps.
      step: 'end' as const,
    })),
  };
}

// ---------- Program adherence ----------

export function adherenceOption(ctx: ChartContext, weeks: AdherenceWeekDto[]): ChartOption {
  const { t, locale } = ctx;
  const labels = weeks.map((w) => String(w.week));
  const weekLabel = (w: string | number) => ctx.translate('stats.adherence.weekN', { n: w });
  return {
    ...baseOption(t),
    legend: legend(t, 'bar'),
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    tooltip: {
      ...axisTooltip(ctx, weekLabel, (_, y) => plainNumber(y, locale, 0)),
      axisPointer: { type: 'shadow' },
    },
    xAxis: categoryAxis(t, labels, (w) => weekLabel(w)),
    yAxis: { ...valueAxis(t, locale, { zeroBased: true }), minInterval: 1 },
    series: [
      barSeries(
        ctx.translate('stats.adherence.planned'),
        t.categorical[0],
        weeks.map((w) => w.planned),
      ),
      barSeries(
        ctx.translate('stats.adherence.completed'),
        t.categorical[1],
        weeks.map((w) => w.completed),
      ),
    ],
  };
}
