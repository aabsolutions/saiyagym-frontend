import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ChartCard } from './chart-card';

@Component({
  imports: [ChartCard],
  template: `
    <app-chart-card titleKey="t" [empty]="empty()">
      <div chart class="the-chart">chart</div>
      <table table class="the-table"></table>
    </app-chart-card>
  `,
})
class Host {
  readonly empty = signal(false);
}

describe('ChartCard', () => {
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

  const visible = (el: HTMLElement, selector: string) =>
    !el.querySelector(selector)!.closest('[hidden]');

  it('every chart has a table twin one toggle away', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(visible(el, '.the-chart')).toBe(true);
    expect(visible(el, '.the-table')).toBe(false);

    const [, tableToggle] = el.querySelectorAll<HTMLButtonElement>('mat-button-toggle button');
    tableToggle.click();
    await fixture.whenStable();
    expect(visible(el, '.the-chart')).toBe(false);
    expect(visible(el, '.the-table')).toBe(true);
  });

  it('when empty, says so and keeps the projected chart attached but hidden', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.empty.set(true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty')).not.toBeNull();
    expect(el.querySelector('.the-chart')).not.toBeNull();
    expect(visible(el, '.the-chart')).toBe(false);
    expect(el.querySelector('mat-button-toggle-group')).toBeNull();
  });
});
