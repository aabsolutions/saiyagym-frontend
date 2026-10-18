import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProgramDto } from '../../api/models/program-dto';
import { emptyProgram, setCell, toProgramDto } from './program-draft';
import { ProgramWizardStore } from './program-wizard.store';

const settle = () => new Promise((resolve) => setTimeout(resolve));
const program = (status: ProgramDto['status']): ProgramDto => ({
  id: 'p1',
  name: 'PPL',
  notes: '',
  status,
  durationWeeks: 4,
  startDate: null,
  activatedAt: null,
  completedAt: null,
  templateId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deload: { mode: 'weight', weeks: [], percent: 40 },
  trainingMaxes: [],
  weeks: [],
});

describe('ProgramWizardStore.save', () => {
  let httpMock: HttpTestingController;
  let store: ProgramWizardStore;
  const body = toProgramDto(setCell(emptyProgram(), 0, 1, 'push'), 'metric');
  const rules = [{ routineId: 'push', body: { name: 'Push', notes: '', exercises: [] } }];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProgramWizardStore],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ProgramWizardStore);
  });

  afterEach(() => httpMock.verify());

  it('saves the routine rules first, then the program, then activates it', async () => {
    const saving = store.save(body, rules, '2026-11-02');

    httpMock.expectOne({ method: 'PATCH', url: '/api/v1/routines/push' }).flush({
      id: 'push',
      name: 'Push',
      notes: '',
      archived: false,
      exercises: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    await settle();
    httpMock.expectOne({ method: 'POST', url: '/api/v1/programs' }).flush(program('draft'));
    await settle();
    const activate = httpMock.expectOne('/api/v1/programs/p1/activate');
    expect(activate.request.body).toEqual({ startDate: '2026-11-02' });
    activate.flush(program('active'));

    expect((await saving)?.status).toBe('active');
  });

  it('returns the saved draft when only the activation fails (e.g. Free plan limit)', async () => {
    const saving = store.save(body, [], '2026-11-02');
    httpMock.expectOne({ method: 'POST', url: '/api/v1/programs' }).flush(program('draft'));
    await settle();
    httpMock
      .expectOne('/api/v1/programs/p1/activate')
      .flush({ code: 'PLAN_LIMIT_REACHED' }, { status: 403, statusText: 'Forbidden' });

    expect((await saving)?.status).toBe('draft');
    expect(store.program()?.id).toBe('p1');
  });

  it('stops before the program if a routine rule is refused (Premium)', async () => {
    const saving = store.save(body, rules, null);
    httpMock
      .expectOne('/api/v1/routines/push')
      .flush({ code: 'PLAN_FEATURE_REQUIRED' }, { status: 403, statusText: 'Forbidden' });

    expect(await saving).toBeNull();
    httpMock.expectNone('/api/v1/programs');
  });
});
