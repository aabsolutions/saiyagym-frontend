import { BarChart, HeatmapChart, LineChart } from 'echarts/charts';
import {
  AriaComponent,
  CalendarComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

/**
 * Only the pieces our charts use (tree-shaken echarts). Loaded lazily by <app-chart>, so
 * echarts never lands in the initial bundle.
 */
use([
  BarChart,
  HeatmapChart,
  LineChart,
  AriaComponent,
  CalendarComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export { init } from 'echarts/core';
