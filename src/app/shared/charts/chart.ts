import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { ChartOption } from './chart-options';

/**
 * An echarts canvas. echarts itself is loaded on first use (see echarts-setup.ts), so pages
 * without charts never pay for it. Options carry their own colors: rebuild them in a
 * `computed` that reads ChartTheme and the chart follows theme, language and units.
 */
@Component({
  selector: 'app-chart',
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts: () => import('./echarts-setup') })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      echarts
      class="canvas"
      role="img"
      [attr.aria-label]="label()"
      [options]="options()"
      [autoResize]="true"
      [style.height.px]="height()"
    ></div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .canvas {
      width: 100%;
    }
  `,
})
export class Chart {
  readonly options = input.required<ChartOption>();
  /** Includes the axis band: the plot never overflows its card. */
  readonly height = input(280);
  /** What the chart shows, for screen readers (the table view has the numbers). */
  readonly label = input.required<string>();
}
