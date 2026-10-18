import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LANGUAGES } from '../../core/i18n/languages';
import { Translatable } from './translatable';
import { TranslatableField } from './translatable-field';

@Component({
  imports: [TranslatableField],
  template: `<app-translatable-field labelKey="name" mandatory [(value)]="value" />`,
})
class Host {
  readonly value = signal<Translatable>({ es: 'Pecho', en: '' });
}

describe('TranslatableField', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        Host,
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
    });
  });

  it('has one tab per configured language and marks the untranslated ones', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const tabs = [...el.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.textContent?.trim())).toEqual(LANGUAGES.map((l) => l.label));
    expect(tabs[0].querySelector('.dot')).toBeNull();
    expect(tabs[1].querySelector('.dot')).not.toBeNull();
  });

  it('writes the language being edited, leaving the others', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    expect(input.lang).toBe('es');
    input.value = 'Pectoral';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toEqual({ es: 'Pectoral', en: '' });
  });
});
