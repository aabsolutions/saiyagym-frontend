import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { TemplatesStore } from './templates.store';

@Component({
  selector: 'app-template-gallery-page',
  imports: [MatIconModule, MatProgressBarModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">{{ 'programs.templates.hint' | transloco }}</p>
    @if (store.isPending()) {
      <mat-progress-bar mode="indeterminate" />
    }
    <ul class="gallery">
      @for (t of store.templates(); track t.id) {
        <li>
          <a class="card" [routerLink]="['/programs/templates', t.id]">
            <span class="name">{{ t.name }}</span>
            <span class="tags">
              <span>{{ 'profile.goal.' + t.goal | transloco }}</span>
              <span>{{ 'profile.level.' + t.level | transloco }}</span>
            </span>
            <span class="desc">{{ t.description }}</span>
            <span class="facts">
              <span
                ><mat-icon aria-hidden="true">date_range</mat-icon
                >{{ 'programs.wizard.weeksCount' | transloco: { count: t.durationWeeks } }}</span
              >
              <span
                ><mat-icon aria-hidden="true">event_repeat</mat-icon
                >{{ 'programs.templates.daysPerWeek' | transloco: { count: t.daysPerWeek } }}</span
              >
              <span
                ><mat-icon aria-hidden="true">list_alt</mat-icon
                >{{ 'programs.templates.routines' | transloco: { count: t.routineCount } }}</span
              >
            </span>
            @if (t.usesAutoProgression) {
              <span class="premium" [class.locked]="!auth.hasFeature('autoProgression')">
                <mat-icon aria-hidden="true">trending_up</mat-icon>
                {{
                  (auth.hasFeature('autoProgression')
                    ? 'programs.templates.withProgression'
                    : 'programs.templates.progressionDropped'
                  ) | transloco
                }}
              </span>
            }
          </a>
        </li>
      } @empty {
        @if (store.isFulfilled()) {
          <li class="empty">{{ 'programs.templates.empty' | transloco }}</li>
        }
      }
    </ul>
  `,
  styles: `
    .hint {
      margin: 0 0 16px;
      color: var(--mat-sys-on-surface-variant);
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .card {
      display: flex;
      height: 100%;
      box-sizing: border-box;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-top: 4px solid var(--mat-sys-primary);
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-surface-container-low);
      color: inherit;
      text-decoration: none;
      &:hover,
      &:focus-visible {
        background: var(--mat-sys-surface-container);
      }
    }
    .name {
      font: var(--mat-sys-title-large);
    }
    .tags {
      display: flex;
      gap: 6px;
      span {
        padding: 2px 8px;
        border-radius: var(--mat-sys-corner-full);
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
        font: var(--mat-sys-label-small);
      }
    }
    .desc {
      flex: 1;
      color: var(--mat-sys-on-surface-variant);
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font: var(--mat-sys-body-small);
      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
      }
    }
    .premium {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--sg-gold);
      font: var(--mat-sys-label-medium);
      &.locked {
        color: var(--mat-sys-on-surface-variant);
      }
    }
    .empty {
      grid-column: 1 / -1;
      padding: 32px 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class TemplateGalleryPage implements OnInit {
  protected readonly store = inject(TemplatesStore);
  protected readonly auth = inject(AuthStore);

  ngOnInit(): void {
    void this.store.loadList();
  }
}
