import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const dialog = { open: vi.fn() };

  beforeEach(() => {
    dialog.open.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: dialog }] });
  });

  const run = (component: HasUnsavedChanges) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(
        component,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    ) as Promise<boolean>;

  it('lets you leave a clean editor without asking', async () => {
    expect(await run({ hasUnsavedChanges: () => false })).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('asks before leaving with changes and respects the answer', async () => {
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(true) });
    expect(await run({ hasUnsavedChanges: () => true })).toBe(true);

    dialog.open.mockReturnValueOnce({ afterClosed: () => of(undefined) }); // Esc / backdrop
    expect(await run({ hasUnsavedChanges: () => true })).toBe(false);
  });
});
