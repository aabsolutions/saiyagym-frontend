import { escapeHtml, tooltipHtml } from './chart-options';
import { DARK_CHART_TOKENS, LIGHT_CHART_TOKENS, chartTokens } from './chart-palette';
import { exceedsFreeWindow, rangeFrom } from './stat-range';

describe('chart palette', () => {
  it('picks the validated steps of the resolved theme', () => {
    expect(chartTokens('light')).toBe(LIGHT_CHART_TOKENS);
    expect(chartTokens('dark')).toBe(DARK_CHART_TOKENS);
  });

  it('keeps the same 8 slots in both modes (identity survives a theme switch)', () => {
    expect(LIGHT_CHART_TOKENS.categorical).toHaveLength(8);
    expect(DARK_CHART_TOKENS.categorical).toHaveLength(8);
    expect(new Set(LIGHT_CHART_TOKENS.categorical).size).toBe(8);
  });
});

describe('tooltips', () => {
  it('escapes names coming from the API', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    const html = tooltipHtml(
      '5 oct',
      [{ color: '#2a78d6', name: '<b>Curl</b>', value: '100 kg' }],
      LIGHT_CHART_TOKENS,
    );
    expect(html).not.toContain('<b>Curl</b>');
    expect(html).toContain('&lt;b&gt;Curl&lt;/b&gt;');
  });

  it('puts the value before the series name', () => {
    const html = tooltipHtml(
      't',
      [{ color: '#000', name: 'Bench', value: '80 kg' }],
      LIGHT_CHART_TOKENS,
    );
    expect(html.indexOf('80 kg')).toBeLessThan(html.indexOf('Bench'));
  });
});

describe('stat ranges', () => {
  const now = new Date(2026, 9, 18, 15, 30); // 18 Oct 2026, local

  it('starts at LOCAL midnight N days back (today included)', () => {
    expect(rangeFrom('30d', now)).toBe(new Date(2026, 8, 19).toISOString());
    expect(rangeFrom('90d', now)).toBe(new Date(2026, 6, 21).toISOString());
    expect(rangeFrom('6m', now)).toBe(new Date(2026, 3, 18).toISOString());
    expect(rangeFrom('1y', now)).toBe(new Date(2025, 9, 18).toISOString());
  });

  it('"all" sends no lower bound', () => {
    expect(rangeFrom('all', now)).toBeUndefined();
  });

  it('only ranges past 90 days exceed the Free window', () => {
    expect(exceedsFreeWindow('30d')).toBe(false);
    expect(exceedsFreeWindow('90d')).toBe(false);
    expect(exceedsFreeWindow('6m')).toBe(true);
    expect(exceedsFreeWindow('all')).toBe(true);
  });
});
