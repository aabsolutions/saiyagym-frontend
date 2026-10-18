import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { exportControllerExport$Json } from '../../api/fn/export/export-controller-export-json';
import { todayIso } from '../../shared/format/local-dates';
import { RequireFeatureDirective } from '../../shared/plans/require-feature.directive';

export type ExportKind = 'json' | 'workouts' | 'measurements';

/** Query and file name per download. The API decides the content; we only name the file. */
export function exportRequest(
  kind: ExportKind,
  today = todayIso(),
): { params: Record<string, string>; filename: string } {
  return kind === 'json'
    ? { params: { format: 'json' }, filename: `saiyagym-export-${today}.json` }
    : { params: { format: 'csv', dataset: kind }, filename: `saiyagym-${kind}-${today}.csv` };
}

/**
 * Premium data export. A file download, so it goes through HttpClient as a blob (the
 * generated client parses the body). Everything, all-time: it's the user's data.
 */
@Component({
  selector: 'app-export-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule, RequireFeatureDirective, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>{{ 'profile.export.title' | transloco }}</mat-card-title>
        <mat-card-subtitle>{{ 'profile.export.hint' | transloco }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="actions" *requireFeature="'dataExport'">
          @for (kind of kinds; track kind) {
            <button
              mat-stroked-button
              type="button"
              [disabled]="busy() !== null"
              (click)="download(kind)"
            >
              <mat-icon>{{ busy() === kind ? 'hourglass_top' : 'download' }}</mat-icon>
              {{ 'profile.export.' + kind | transloco }}
            </button>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class ExportCard {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  protected readonly kinds: readonly ExportKind[] = ['json', 'workouts', 'measurements'];
  protected readonly busy = signal<ExportKind | null>(null);

  protected async download(kind: ExportKind): Promise<void> {
    const { params, filename } = exportRequest(kind);
    this.busy.set(kind);
    try {
      const blob = await firstValueFrom(
        this.http.get(exportControllerExport$Json.PATH, {
          params: new HttpParams({ fromObject: params }),
          responseType: 'blob',
        }),
      );
      const url = URL.createObjectURL(blob);
      const link = this.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      // errorInterceptor already reported it.
    } finally {
      this.busy.set(null);
    }
  }
}
