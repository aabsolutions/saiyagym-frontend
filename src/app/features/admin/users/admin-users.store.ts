import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  from,
  of,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { AdminUserDto } from '../../../api/models/admin-user-dto';
import { AssignPlanDto } from '../../../api/models/assign-plan-dto';
import { PlanResponseDto } from '../../../api/models/plan-response-dto';
import { AdminPlansService } from '../../../api/services/admin-plans.service';
import { AdminUsersService } from '../../../api/services/admin-users.service';
import { Notifier } from '../../../core/notify/notifier';

export type Role = AdminUserDto['role'];
export const ROLES: readonly Role[] = ['user', 'admin', 'coach'];
export const USERS_PAGE_SIZE = 20;

interface AdminUsersState {
  search: string;
  role: Role | null;
  page: number;
  items: AdminUserDto[];
  total: number;
  pending: boolean;
  plans: PlanResponseDto[];
}

export const AdminUsersStore = signalStore(
  withState<AdminUsersState>({
    search: '',
    role: null,
    page: 1,
    items: [],
    total: 0,
    pending: false,
    plans: [],
  }),
  withProps(() => ({
    _users: inject(AdminUsersService),
    _plans: inject(AdminPlansService),
    _notifier: inject(Notifier),
  })),
  withComputed(({ search, role, page, plans }) => ({
    request: computed(() => ({
      page: page(),
      limit: USERS_PAGE_SIZE,
      ...(search().trim() && { search: search().trim() }),
      ...(role() && { role: role()! }),
    })),
    planById: computed(() => new Map(plans().map((p) => [p.id, p]))),
  })),
  withMethods((store) => {
    const replace = (user: AdminUserDto) =>
      patchState(store, (s) => ({ items: s.items.map((u) => (u.id === user.id ? user : u)) }));

    return {
      _load: rxMethod<ReturnType<typeof store.request>>(
        pipe(
          debounceTime(250),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
          tap(() => patchState(store, { pending: true })),
          switchMap((request) =>
            from(store._users.adminUsersControllerList(request)).pipe(
              tap((page) =>
                patchState(store, { items: page.items, total: page.meta.total, pending: false }),
              ),
              catchError(() => {
                patchState(store, { pending: false });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      setSearch: (search: string) => patchState(store, { search, page: 1 }),
      setRole: (role: Role | null) => patchState(store, { role, page: 1 }),
      setPage: (page: number) => patchState(store, { page }),

      async loadPlans(): Promise<void> {
        try {
          patchState(store, { plans: await store._plans.adminPlansControllerFindAll() });
        } catch {
          // Plan names fall back to their id.
        }
      },

      async changeRole(user: AdminUserDto, role: Role): Promise<void> {
        try {
          replace(
            await store._users.adminUsersControllerChangeRole({ id: user.id, body: { role } }),
          );
          store._notifier.info('admin.users.roleChanged');
        } catch {
          // The select goes back to the stored role (errors already shown).
          replace({ ...user });
        }
      },

      async assignPlan(user: AdminUserDto, body: AssignPlanDto): Promise<boolean> {
        try {
          replace(await store._users.adminUsersControllerAssignPlan({ id: user.id, body }));
          store._notifier.info('admin.users.planAssigned');
          return true;
        } catch {
          return false;
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      store._load(store.request);
      void store.loadPlans();
    },
  }),
);

export type AdminUsersStore = InstanceType<typeof AdminUsersStore>;
