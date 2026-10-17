import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { LengthPipe } from './length.pipe';
import { cmToIn, inToCm, kgToLb, lbToKg } from './units';
import { WeightPipe } from './weight.pipe';

describe('unit conversions', () => {
  it('uses the exact international pound and inch', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3);
    expect(lbToKg(225)).toBeCloseTo(102.058, 3);
    expect(cmToIn(2.54)).toBe(1);
    expect(inToCm(10)).toBeCloseTo(25.4, 10);
  });

  it('round-trips without drift', () => {
    expect(lbToKg(kgToLb(82.5))).toBeCloseTo(82.5, 10);
  });
});

describe('weight & length pipes', () => {
  const units = signal<'metric' | 'imperial'>('metric');

  beforeEach(() => {
    units.set('metric');
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: { units: { kg: 'kg', lb: 'lb', cm: 'cm', in: 'in' } } },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ],
      providers: [WeightPipe, LengthPipe, { provide: PreferencesStore, useValue: { units } }],
    });
  });

  it('formats kg with the locale and follows the preference', () => {
    const pipe = TestBed.inject(WeightPipe);
    expect(pipe.transform(82.5)).toBe('82,5 kg');
    units.set('imperial');
    expect(pipe.transform(100)).toBe('220,5 lb');
  });

  it('formats cm / in', () => {
    const pipe = TestBed.inject(LengthPipe);
    expect(pipe.transform(80)).toBe('80 cm');
    units.set('imperial');
    expect(pipe.transform(80)).toBe('31,5 in');
  });

  it('accepts an explicit unit system and empty values', () => {
    const pipe = TestBed.inject(WeightPipe);
    expect(pipe.transform(100, { system: 'imperial', digits: 0 })).toBe('220 lb');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
