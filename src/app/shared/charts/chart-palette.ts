/**
 * Chart colors as plain hex: echarts paints on a canvas and can't read CSS variables.
 *
 * Categorical slots are assigned in this fixed order, never cycled (a 9th series folds into
 * "other"). The order IS the colorblind-safety mechanism: validated against our own surfaces
 * (`--mat-sys-surface`: light #fbf8ff, dark #10131f) — every adjacent pair clears CVD ΔE ≥ 8.4
 * and normal-vision ΔE ≥ 19. Three light slots sit below 3:1 on the surface, so every chart
 * also offers a table view. Re-run the validator if you change a single hex.
 *
 * Chrome (ink, grid, axis) follows the Material neutral palette of styles/_theme-colors.scss.
 */
export interface ChartTokens {
  surface: string;
  textPrimary: string;
  textSecondary: string;
  muted: string;
  grid: string;
  axis: string;
  tooltipBackground: string;
  tooltipBorder: string;
  categorical: readonly string[];
  /**
   * Ordinal ramp, "a little" → "a lot" (heatmap bins). One hue; the step nearest the surface
   * still clears 2:1 (validated with --ordinal in both modes).
   */
  ordinal: readonly string[];
  /** Calendar cells with no data. */
  empty: string;
}

export const LIGHT_CHART_TOKENS: ChartTokens = {
  surface: '#fbf8ff',
  textPrimary: '#181b27',
  textSecondary: '#444651',
  muted: '#757682',
  grid: '#e1e1ef',
  axis: '#c5c5d3',
  tooltipBackground: '#ffffff',
  tooltipBorder: '#e1e1ef',
  categorical: [
    '#2a78d6',
    '#eb6834',
    '#1baf7a',
    '#eda100',
    '#e87ba4',
    '#008300',
    '#6250d6',
    '#e34948',
  ],
  ordinal: ['#86b6ef', '#3987e5', '#256abf', '#184f95'],
  empty: '#efefff',
};

/** Same hues, stepped for the dark surface (selected, not an automatic flip). */
export const DARK_CHART_TOKENS: ChartTokens = {
  surface: '#10131f',
  textPrimary: '#e0e1f3',
  textSecondary: '#c5c5d3',
  muted: '#8f909d',
  grid: '#272936',
  axis: '#444651',
  tooltipBackground: '#1c1f2c',
  tooltipBorder: '#323442',
  categorical: [
    '#3987e5',
    '#d95926',
    '#199e70',
    '#c98500',
    '#d55181',
    '#008300',
    '#9085e9',
    '#e66767',
  ],
  // On a dark surface "a little" is dark: the ramp climbs toward light.
  ordinal: ['#184f95', '#256abf', '#3987e5', '#86b6ef'],
  empty: '#1c1f2c',
};

export const chartTokens = (theme: 'light' | 'dark'): ChartTokens =>
  theme === 'dark' ? DARK_CHART_TOKENS : LIGHT_CHART_TOKENS;
