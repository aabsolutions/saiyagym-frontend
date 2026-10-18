import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CanDeactivateFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

/** A page with an editor implements this; the guard asks before leaving with changes. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

const DATA: ConfirmDialogData = {
  title: 'common.unsaved.title',
  message: 'common.unsaved.message',
  confirm: 'common.unsaved.leave',
  danger: true,
};

/**
 * In-app navigation only. Closing/reloading the tab is covered by the page's own
 * `beforeunload` listener (browsers show their generic prompt there).
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = async (component) => {
  if (!component.hasUnsavedChanges()) return true;
  const dialog = inject(MatDialog);
  const leave = await firstValueFrom(dialog.open(ConfirmDialog, { data: DATA }).afterClosed());
  return leave === true;
};
