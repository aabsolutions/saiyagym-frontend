import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs';
import {
  EQUIPMENT,
  MECHANICS,
  MUSCLES,
  TIERS,
  TIER_GOALS,
} from '../../shared/exercises/exercise-taxonomy';
import { UpgradeCta } from '../../shared/plans/upgrade-cta';
import { ExerciseCard } from './exercise-card';
import {
  ExerciseFilters,
  PAGE_SIZES,
  filtersFromParams,
  filtersToParams,
  pageFromParams,
} from './exercise-filters';
import { ExercisesStore } from './exercises.store';

export const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-exercise-list-page',
  imports: [
    ExerciseCard,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    RouterLink,
    TranslocoPipe,
    UpgradeCta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-list-page.html',
  styleUrl: './exercise-list-page.scss',
})
export class ExerciseListPage {
  protected readonly store = inject(ExercisesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly muscles = MUSCLES;
  protected readonly equipment = EQUIPMENT;
  protected readonly mechanics = MECHANICS;
  protected readonly tiers = TIERS;
  protected readonly goals = TIER_GOALS;
  protected readonly pageSizes = PAGE_SIZES;

  protected readonly showFilters = signal(false);
  /** What the user is typing; the store only sees it after the debounce. */
  protected readonly searchText = signal('');
  protected readonly filters = this.store.filters;

  protected readonly customUsage = computed(() => {
    const max = this.store.customLimit();
    const count = this.store.customCount();
    return max === null || count === null ? null : { count, max };
  });

  constructor() {
    // URL → store, once. The URL is the source of truth on arrival (shared links, back button).
    const params = this.route.snapshot.queryParams;
    const filters = filtersFromParams(params, this.store.defaultGoal());
    const { page, limit } = pageFromParams(params);
    this.store.init(filters, page, limit);
    this.searchText.set(filters.q);

    toObservable(this.searchText)
      .pipe(skip(1), debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.store.setFilters({ q }));

    // Store → URL (replaceUrl: filtering shouldn't flood the history).
    effect(() => {
      const queryParams = filtersToParams(
        this.store.filters(),
        this.store.page(),
        this.store.limit(),
        this.store.defaultGoal(),
      );
      untracked(() =>
        this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true }),
      );
    });

    // Every arrival (also back from creating/deleting one): the slot count may have changed.
    void this.store.loadCustomCount();
  }

  protected set<K extends keyof ExerciseFilters>(key: K, value: ExerciseFilters[K]): void {
    this.store.setFilters({ [key]: value } as Partial<ExerciseFilters>);
  }

  protected clearSearch(): void {
    this.searchText.set('');
    this.store.setFilters({ q: '' });
  }

  protected onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1, event.pageSize);
  }
}
