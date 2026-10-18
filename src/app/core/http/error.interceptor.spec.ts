import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Notifier } from '../notify/notifier';
import { UpgradePrompt } from '../plans/upgrade-prompt';
import { errorInterceptor } from './error.interceptor';

const es = {
  errors: {
    ROUTINE_NOT_FOUND: 'La rutina no existe.',
    // Test-only code with a placeholder (PLAN_* errors go to the upgrade dialog instead).
    TOO_BIG: 'Máximo {{max}} elementos.',
    NETWORK_ERROR: 'Sin conexión.',
    UNKNOWN_ERROR: 'Error inesperado.',
  },
};

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const notifier = { error: vi.fn() };
  const upgradePrompt = { open: vi.fn(() => Promise.resolve()) };

  beforeEach(() => {
    notifier.error.mockReset();
    upgradePrompt.open.mockClear();
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Notifier, useValue: notifier },
        { provide: UpgradePrompt, useValue: upgradePrompt },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const failWith = (url: string, body: string | object, status: number) => {
    let error: unknown;
    http.get(url).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(url).flush(body, { status, statusText: 'x' });
    return error;
  };

  it('translates by code and re-throws the error', () => {
    const error = failWith(
      '/api/v1/routines/1',
      { statusCode: 404, code: 'ROUTINE_NOT_FOUND', message: 'Routine does not exist.' },
      404,
    );
    expect(notifier.error).toHaveBeenCalledWith('La rutina no existe.');
    expect(error).toMatchObject({ status: 404 });
  });

  it('interpolates placeholders from `details`', () => {
    failWith(
      '/api/v1/routines',
      { statusCode: 400, code: 'TOO_BIG', message: 'm', details: { max: 3 } },
      400,
    );
    expect(notifier.error).toHaveBeenCalledWith('Máximo 3 elementos.');
  });

  it("falls back to the API's localized message when the placeholder can't be filled", () => {
    failWith('/api/v1/routines', { statusCode: 400, code: 'TOO_BIG', message: 'Máx (3).' }, 400);
    expect(notifier.error).toHaveBeenCalledWith('Máx (3).');
  });

  it('opens the upgrade dialog (not the snackbar) for PLAN_* errors', () => {
    failWith(
      '/api/v1/routines',
      {
        statusCode: 403,
        code: 'PLAN_LIMIT_REACHED',
        message: 'm',
        details: { resource: 'routines', limit: 3, current: 3, requested: 1 },
      },
      403,
    );
    failWith(
      '/api/v1/progress-photos',
      {
        statusCode: 403,
        code: 'PLAN_FEATURE_REQUIRED',
        message: 'm',
        details: { feature: 'progressPhotos' },
      },
      403,
    );
    expect(upgradePrompt.open).toHaveBeenNthCalledWith(1, {
      kind: 'limit',
      resource: 'routines',
      limit: 3,
    });
    expect(upgradePrompt.open).toHaveBeenNthCalledWith(2, {
      kind: 'feature',
      feature: 'progressPhotos',
    });
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it("falls back to the API's message for codes we don't know", () => {
    failWith('/api/v1/x', { statusCode: 409, code: 'BRAND_NEW_CODE', message: 'Nuevo.' }, 409);
    expect(notifier.error).toHaveBeenCalledWith('Nuevo.');
  });

  it('uses a generic message when the body is not an API error', () => {
    failWith('/api/v1/x', '<html>', 500);
    expect(notifier.error).toHaveBeenCalledWith('Error inesperado.');
  });

  it('reports network errors', () => {
    http.get('/api/v1/x').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/v1/x').error(new ProgressEvent('error'), { status: 0 });
    expect(notifier.error).toHaveBeenCalledWith('Sin conexión.');
  });

  it('stays silent on 401 from protected routes (the session handler speaks)', () => {
    failWith('/api/v1/routines', { statusCode: 401, code: 'UNAUTHORIZED', message: '' }, 401);
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it('reports 401 from login (wrong credentials)', () => {
    let failed = false;
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => (failed = true) });
    httpMock
      .expectOne('/api/v1/auth/login')
      .flush(
        { statusCode: 401, code: 'ROUTINE_NOT_FOUND', message: '' },
        { status: 401, statusText: 'x' },
      );
    expect(failed).toBe(true);
    expect(notifier.error).toHaveBeenCalledOnce();
  });
});
