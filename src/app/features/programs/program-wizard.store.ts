import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { CreateProgramDto } from '../../api/models/create-program-dto';
import { ProgramDto } from '../../api/models/program-dto';
import { RoutineDetailDto } from '../../api/models/routine-detail-dto';
import { RoutineExerciseDto } from '../../api/models/routine-exercise-dto';
import { RoutineSummaryDto } from '../../api/models/routine-summary-dto';
import { ProgramsService } from '../../api/services/programs.service';
import { RoutinesService } from '../../api/services/routines.service';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';

interface WizardState {
  program: ProgramDto | null;
  /** Every routine the user can schedule (active + archived: programs may use archived ones). */
  routines: RoutineSummaryDto[];
  /** Full routines scheduled in the program, for the progression step. */
  details: Record<string, RoutineDetailDto>;
  saving: boolean;
}

export interface RoutineRulesChange {
  routineId: string;
  body: { name: string; notes: string; exercises: RoutineExerciseDto[] };
}

export const ProgramWizardStore = signalStore(
  withState<WizardState>({ program: null, routines: [], details: {}, saving: false }),
  withRequestStatus(),
  withProps(() => ({ _programs: inject(ProgramsService), _routines: inject(RoutinesService) })),
  withMethods((store) => ({
    /** `id` null = new program. Resolves to the program being edited (or null). */
    async load(id: string | null): Promise<ProgramDto | null> {
      patchState(store, setPending());
      try {
        const [program, page] = await Promise.all([
          id ? store._programs.programsControllerDetail({ id }) : Promise.resolve(null),
          store._routines.routinesControllerList({ archived: 'all', page: 1, limit: 100 }),
        ]);
        patchState(store, { program, routines: page.items }, setFulfilled());
        return program;
      } catch (error) {
        patchState(store, setError(error));
        return null;
      }
    },

    /** Fetches the scheduled routines not loaded yet (in parallel). */
    async loadDetails(routineIds: string[]): Promise<void> {
      const missing = routineIds.filter((id) => !store.details()[id]);
      const loaded = await Promise.all(
        missing.map((id) => store._routines.routinesControllerDetail({ id }).catch(() => null)),
      );
      const details = { ...store.details() };
      for (const routine of loaded) if (routine) details[routine.id] = routine;
      patchState(store, { details });
    },

    /**
     * Rules first (they live in the routines), then the program, then activation. Stops at
     * the first failure; the interceptor (or the upgrade dialog) already explained it.
     */
    async save(
      program: CreateProgramDto,
      rules: RoutineRulesChange[],
      activateOn: string | null,
    ): Promise<ProgramDto | null> {
      patchState(store, { saving: true });
      try {
        for (const change of rules) {
          const saved = await store._routines.routinesControllerUpdate({
            id: change.routineId,
            body: change.body,
          });
          patchState(store, { details: { ...store.details(), [saved.id]: saved } });
        }
        const existing = store.program();
        const saved = existing
          ? await store._programs.programsControllerUpdate({ id: existing.id, body: program })
          : await store._programs.programsControllerCreate({ body: program });
        patchState(store, { program: saved });
        if (!activateOn || saved.status !== 'draft') return saved;
        try {
          const active = await store._programs.programsControllerActivate({
            id: saved.id,
            body: { startDate: activateOn },
          });
          patchState(store, { program: active });
          return active;
        } catch {
          // Saved but not activated (e.g. Free with one active already → upgrade dialog):
          // the caller still gets the saved draft, so it isn't shown as unsaved.
          return saved;
        }
      } catch {
        return null;
      } finally {
        patchState(store, { saving: false });
      }
    },
  })),
);

export type ProgramWizardStore = InstanceType<typeof ProgramWizardStore>;
