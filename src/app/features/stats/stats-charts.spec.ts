import { MuscleVolumeRowDto } from '../../api/models/muscle-volume-row-dto';
import { LIGHT_CHART_TOKENS } from '../../shared/charts/chart-palette';
import { ChartContext } from '../../shared/charts/chart-theme';
import { kgToLb } from '../../shared/units/units';
import {
  MAX_MUSCLES,
  exerciseStrengthOption,
  frequencyHeatmapOption,
  muscleVolumeOption,
  toggleMuscleSlot,
  topMuscles,
  volumeBins,
  weeksOf,
} from './stats-charts';

const ctx = (imperial = false): ChartContext => ({
  t: LIGHT_CHART_TOKENS,
  locale: 'es',
  imperial,
  weightUnit: imperial ? 'lb' : 'kg',
  lengthUnit: imperial ? 'in' : 'cm',
  translate: (key) => key,
});

const row = (
  week: string,
  muscle: string,
  sets: number,
  volumeKg = sets * 100,
): MuscleVolumeRowDto => ({
  week,
  muscle,
  sets,
  volumeKg,
});

// Minimal views of the option shapes the assertions read.
interface Series {
  name: string;
  data: unknown[];
  itemStyle: { color: string };
}

describe('exercise evolution', () => {
  const points = [
    { date: '2026-10-01', workoutId: 'w1', maxWeightKg: 100, bestE1RM: 110, volumeKg: 3000 },
    { date: '2026-10-08', workoutId: 'w2', maxWeightKg: 102.5, bestE1RM: null, volumeKg: 3200 },
  ];

  it('plots max weight and e1RM on ONE axis, in the user unit', () => {
    const option = exerciseStrengthOption(ctx(true), points);
    expect(Array.isArray(option.yAxis)).toBe(false);
    const series = option.series as Series[];
    expect(series.map((s) => s.name)).toEqual(['stats.exercise.maxWeight', 'stats.exercise.e1rm']);
    expect((series[0].data[0] as number[])[1]).toBeCloseTo(kgToLb(100));
    // A session without a valid e1RM (reps > 12) is a gap, not a zero.
    expect((series[1].data[1] as unknown[])[1]).toBeNull();
  });
});

describe('muscle volume', () => {
  it('fills the weeks without data so gaps show as zero', () => {
    const rows = [row('2026-09-28', 'chest', 10), row('2026-10-12', 'chest', 8)];
    expect(weeksOf(rows)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12']);
  });

  it('ranks muscles by working sets', () => {
    const rows = [row('w', 'quads', 5), row('w', 'chest', 12), row('v', 'quads', 9)];
    expect(topMuscles(rows, 1)).toEqual(['quads']);
    expect(topMuscles(rows, 5)).toEqual(['quads', 'chest']);
  });

  it('keeps every muscle in its slot when another one leaves (color follows the entity)', () => {
    let slots = toggleMuscleSlot(toggleMuscleSlot(toggleMuscleSlot([], 'chest'), 'lats'), 'quads');
    expect(slots).toEqual(['chest', 'lats', 'quads']);
    slots = toggleMuscleSlot(slots, 'lats');
    expect(slots).toEqual(['chest', null, 'quads']);
    slots = toggleMuscleSlot(slots, 'biceps');
    expect(slots).toEqual(['chest', 'biceps', 'quads']);
  });

  it('never goes past the slot cap', () => {
    const full = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(full).toHaveLength(MAX_MUSCLES);
    expect(toggleMuscleSlot(full, 'g')).toBe(full);
  });

  it('paints each series with its slot color and zero-fills missing weeks', () => {
    const rows = [row('2026-10-05', 'chest', 10), row('2026-10-12', 'lats', 6)];
    const option = muscleVolumeOption(ctx(), rows, ['chest', null, 'lats'], 'sets');
    const series = option.series as Series[];
    expect(series.map((s) => s.itemStyle.color)).toEqual([
      LIGHT_CHART_TOKENS.categorical[0],
      LIGHT_CHART_TOKENS.categorical[2],
    ]);
    expect(series[0].data).toEqual([10, 0]);
    expect(series[1].data).toEqual([0, 6]);
  });
});

describe('frequency heatmap', () => {
  it('cuts bins at the quartiles of the trained days', () => {
    expect(volumeBins([])).toEqual([]);
    expect(volumeBins([100, 200, 300, 400, 500, 600, 700, 800])).toEqual([300, 500, 700]);
  });

  it('starts weeks on the user first day (ISO 7 = Sunday → echarts 0)', () => {
    const frequency = {
      year: 2026,
      weeks: [],
      heatmap: [{ date: '2026-10-01', sessions: 1, volumeKg: 5000 }],
      window: { from: null, to: '2026-10-18T00:00:00.000Z', limitedByPlan: false },
    };
    const sunday = frequencyHeatmapOption(ctx(), frequency, 7);
    const monday = frequencyHeatmapOption(ctx(), frequency, 1);
    const firstDay = (o: typeof sunday) =>
      (o.calendar as { dayLabel: { firstDay: number } }).dayLabel.firstDay;
    expect(firstDay(sunday)).toBe(0);
    expect(firstDay(monday)).toBe(1);
  });
});
