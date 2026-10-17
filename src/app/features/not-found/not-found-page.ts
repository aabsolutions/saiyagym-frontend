import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-not-found-page',
  imports: [MatButtonModule, MatIconModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="not-found">
      <mat-icon aria-hidden="true">explore_off</mat-icon>
      <h1>{{ 'pages.notFound.title' | transloco }}</h1>
      <p>{{ 'pages.notFound.text' | transloco }}</p>
      <a mat-flat-button routerLink="/dashboard">{{ 'pages.notFound.home' | transloco }}</a>
    </main>
  `,
  styles: `
    .not-found {
      display: grid;
      place-items: center;
      align-content: center;
      gap: 8px;
      min-height: 100vh;
      padding: 16px;
      text-align: center;
    }
    mat-icon {
      width: 64px;
      height: 64px;
      font-size: 64px;
      color: var(--sg-gold);
    }
    h1 {
      margin: 0;
      font: var(--mat-sys-headline-medium);
    }
  `,
})
export class NotFoundPage {}
