import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslocoPipe } from '@jsverse/transloco';
import { ColdStartService } from './cold-start.service';

@Component({
  selector: 'app-cold-start-banner',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (coldStart.state()) {
      @case ('waking') {
        <div class="banner" role="status">
          <mat-icon aria-hidden="true">bedtime</mat-icon>
          <div class="text">
            <strong>{{ 'coldStart.waking' | transloco }}</strong>
            <span>{{ 'coldStart.hint' | transloco }}</span>
          </div>
          <mat-progress-bar class="progress" mode="indeterminate" />
        </div>
      }
      @case ('failed') {
        <div class="banner failed" role="alert">
          <mat-icon aria-hidden="true">cloud_off</mat-icon>
          <div class="text">
            <strong>{{ 'coldStart.failed' | transloco }}</strong>
          </div>
          <button mat-flat-button type="button" (click)="coldStart.retry()">
            {{ 'coldStart.retry' | transloco }}
          </button>
        </div>
      }
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 1000;
      display: flex;
      justify-content: center;
      padding: 16px;
      pointer-events: none;
    }
    .banner {
      pointer-events: auto;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 560px;
      padding: 12px 16px;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-inverse-surface);
      color: var(--mat-sys-inverse-on-surface);
      box-shadow: var(--mat-sys-level3);
    }
    .banner.failed mat-icon {
      color: var(--mat-sys-error-container);
    }
    .text {
      display: flex;
      flex-direction: column;
      flex: 1;
      font: var(--mat-sys-body-medium);
    }
    .progress {
      position: absolute;
      inset: auto 0 0 0;
    }
  `,
})
export class ColdStartBanner {
  protected readonly coldStart = inject(ColdStartService);
}
