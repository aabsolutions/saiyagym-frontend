import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { BodyMetricDto } from '../../api/models/body-metric-dto';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { plainNumber } from '../../shared/charts/chart-options';
import { ChartTheme } from '../../shared/charts/chart-theme';
import { PlanWindowNote } from '../../shared/charts/plan-window-note';
import { StatRange } from '../../shared/charts/stat-range';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { LengthPipe } from '../../shared/units/length.pipe';
import { WeightPipe } from '../../shared/units/weight.pipe';
import { measurementOption, measurementUnit, measurementValue } from './body-charts';
import { BodyStore, MEASUREMENTS_PAGE_SIZE } from './body.store';
import { MeasurementDialog, MeasurementDialogData } from './measurement-dialog';
import {
  MEASUREMENT_FIELDS,
  MeasurementField,
  kindOf,
  toCreateDto,
  toUpdateDto,
} from './measurements-model';

@Component({
  selector: 'app-measurements-page',
  imports: [
    Chart,
    ChartCard,
    LengthPipe,
    LocalDatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSelectModule,
    PlanWindowNote,
    StatRange,
    TranslocoPipe,
    WeightPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './measurements-page.html',
  styleUrl: './measurements-page.scss',
})
export class MeasurementsPage {
  protected readonly store = inject(BodyStore);
  private readonly theme = inject(ChartTheme);
  private readonly prefs = inject(PreferencesStore);
  private readonly dialog = inject(MatDialog);

  protected readonly fields = MEASUREMENT_FIELDS;
  protected readonly pageSize = MEASUREMENTS_PAGE_SIZE;
  protected readonly kindOf = kindOf;

  protected readonly points = computed(() => this.store.series()?.points ?? []);
  protected readonly pointsDesc = computed(() => this.points().slice().reverse());
  protected readonly options = computed(() =>
    measurementOption(this.theme.context(), this.store.field(), this.points()),
  );
  protected readonly unit = computed(() =>
    measurementUnit(this.theme.context(), this.store.field()),
  );
  /** "82,4 kg" in the user's unit, for the table twin. */
  protected readonly format = computed(() => {
    const ctx = this.theme.context();
    const field = this.store.field();
    const unit = measurementUnit(ctx, field);
    return (stored: number) =>
      `${plainNumber(measurementValue(ctx, field, stored), ctx.locale)} ${unit}`;
  });

  protected setField(field: MeasurementField): void {
    this.store.setField(field);
  }

  protected onPage(event: PageEvent): void {
    void this.store.loadPage(event.pageIndex + 1);
  }

  protected openEditor(metric: BodyMetricDto | null = null): void {
    const units = this.prefs.units();
    const data: MeasurementDialogData = {
      metric,
      units,
      save: (model) =>
        metric
          ? this.store.update(metric.id, toUpdateDto(model, units, metric))
          : this.store.create(toCreateDto(model, units, crypto.randomUUID())),
    };
    this.dialog.open(MeasurementDialog, { data, width: '640px', maxWidth: '95vw' });
  }

  protected remove(metric: BodyMetricDto): void {
    const data: ConfirmDialogData = {
      title: 'body.deleteTitle',
      message: 'body.deleteMessage',
      confirm: 'body.delete',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) void this.store.remove(metric.id);
      });
  }
}
