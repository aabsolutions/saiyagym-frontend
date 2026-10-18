import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { CopyProgramTemplateDto } from '../../api/models/copy-program-template-dto';
import { CopyProgramTemplateResultDto } from '../../api/models/copy-program-template-result-dto';
import { ProgramTemplateDetailDto } from '../../api/models/program-template-detail-dto';
import { ProgramTemplateSummaryDto } from '../../api/models/program-template-summary-dto';
import { TemplateExerciseViewDto } from '../../api/models/template-exercise-view-dto';
import { ProgramsService } from '../../api/services/programs.service';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/store/with-request-status';

/** Exercises of a template whose targets are a % of a max: they need a training max. */
export function templateMaxNeeds(
  template: ProgramTemplateDetailDto,
): { exerciseId: string; name: string }[] {
  const needs = new Map<string, string>();
  const usesPercent = (e: TemplateExerciseViewDto) =>
    (e.progression as { type?: string } | null)?.type === 'percent_1rm' ||
    e.sets.some((s) => s.percent1RM !== null && s.percent1RM !== undefined);
  for (const routine of template.routines)
    for (const e of routine.exercises)
      if (e.exerciseId && usesPercent(e)) needs.set(e.exerciseId, e.name ?? e.exerciseSlug);
  return [...needs].map(([exerciseId, name]) => ({ exerciseId, name }));
}

/** Global program templates (admin-made, localized by the API). */
export const TemplatesStore = signalStore(
  withState<{ templates: ProgramTemplateSummaryDto[]; detail: ProgramTemplateDetailDto | null }>({
    templates: [],
    detail: null,
  }),
  withRequestStatus(),
  withProps(() => ({ _api: inject(ProgramsService) })),
  withMethods((store) => ({
    async loadList(): Promise<void> {
      if (store.templates().length) return;
      patchState(store, setPending());
      try {
        patchState(
          store,
          { templates: await store._api.programTemplatesControllerList() },
          setFulfilled(),
        );
      } catch (error) {
        patchState(store, setError(error));
      }
    },

    async loadDetail(id: string): Promise<void> {
      patchState(store, setPending(), { detail: null });
      try {
        patchState(
          store,
          { detail: await store._api.programTemplatesControllerDetail({ id }) },
          setFulfilled(),
        );
      } catch (error) {
        patchState(store, setError(error));
      }
    },

    /** Copies routines + a draft program. 403 PLAN_LIMIT_REACHED opens the upgrade dialog. */
    async copy(
      id: string,
      body: CopyProgramTemplateDto,
    ): Promise<CopyProgramTemplateResultDto | null> {
      try {
        return await store._api.programTemplatesControllerCopy({ id, body });
      } catch {
        return null;
      }
    },
  })),
);

export type TemplatesStore = InstanceType<typeof TemplatesStore>;
