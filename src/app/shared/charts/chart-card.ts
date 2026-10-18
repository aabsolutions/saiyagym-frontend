import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Card around one chart and its table twin: every value is reachable without hovering
 * (several palette slots sit below 3:1, so the table is not optional).
 *
 * ```html
 * <app-chart-card titleKey="stats.volume.title" [empty]="!rows().length">
 *   <app-chart chart … />
 *   <table table>…</table>
 * </app-chart-card>
 * ```
 * While `pending`, the previous render stays at reduced opacity (no skeleton flash).
 */
@Component({
  selector: 'app-chart-card',
  imports: [MatButtonToggleModule, MatCardModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined" class="card">
      <header class="head">
        <div class="titles">
          <h2>{{ titleKey() | transloco }}</h2>
          @if (subtitle(); as text) {
            <p class="subtitle">{{ text }}</p>
          }
        </div>
        <div class="tools">
          <ng-content select="[tools]" />
          @if (!empty()) {
            <mat-button-toggle-group
              hideSingleSelectionIndicator
              [value]="view()"
              [attr.aria-label]="'charts.view' | transloco"
              (change)="view.set($event.value)"
            >
              <mat-button-toggle value="chart" [attr.aria-label]="'charts.asChart' | transloco">
                <mat-icon>insert_chart</mat-icon>
              </mat-button-toggle>
              <mat-button-toggle value="table" [attr.aria-label]="'charts.asTable' | transloco">
                <mat-icon>table_rows</mat-icon>
              </mat-button-toggle>
            </mat-button-toggle-group>
          }
        </div>
      </header>

      <div class="body" [class.pending]="pending()" [attr.aria-busy]="pending()">
        <!-- [hidden], not @if: projected content must stay attached (echarts measures it). -->
        @if (empty()) {
          <p class="empty">{{ emptyKey() | transloco }}</p>
        }
        <div [hidden]="empty()">
          <ng-content />
          <div [hidden]="view() !== 'chart'"><ng-content select="[chart]" /></div>
          <div class="table" [hidden]="view() !== 'table'"><ng-content select="[table]" /></div>
        </div>
      </div>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .card {
      height: 100%;
      padding: 16px;
      box-sizing: border-box;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px 16px;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    .subtitle {
      margin: 2px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .body {
      transition: opacity 150ms;
    }
    .body.pending {
      opacity: 0.5;
    }
    .empty {
      margin: 24px 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .table {
      max-height: 360px;
      overflow: auto;
    }
  `,
})
export class ChartCard {
  readonly titleKey = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyKey = input('charts.empty');
  readonly pending = input(false);

  protected readonly view = signal<'chart' | 'table'>('chart');
}
