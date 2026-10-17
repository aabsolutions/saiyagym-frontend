import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TokenPairDto } from '../../api/models/token-pair-dto';
import { AuthStore } from '../auth/auth.store';
import { SessionService } from '../auth/session.service';
import { TokenStorage } from '../auth/token-storage';
import { authInterceptor } from './auth.interceptor';

const REFRESH_URL = '/api/v1/auth/refresh';

const pair = (n: number): TokenPairDto => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  expiresIn: 900,
  refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
  tokenType: 'Bearer',
});

/** Lets promise-based code (generated services, SessionService) advance. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let session: SessionService;
  const auth = { handleSessionExpired: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    auth.handleSessionExpired.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
  });

  afterEach(() => httpMock.verify());

  it('attaches the bearer token to API requests', async () => {
    session.start(pair(1));
    const response = firstValueFrom(http.get('/api/v1/routines'));

    const req = httpMock.expectOne('/api/v1/routines');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush([]);
    await response;
  });

  it('never sends the bearer to non-API or public auth URLs', async () => {
    session.start(pair(1));
    const asset = firstValueFrom(http.get('assets/i18n/es.json'));
    const login = firstValueFrom(http.post('/api/v1/auth/login', {}));

    const assetReq = httpMock.expectOne('assets/i18n/es.json');
    const loginReq = httpMock.expectOne('/api/v1/auth/login');
    expect(assetReq.request.headers.has('Authorization')).toBe(false);
    expect(loginReq.request.headers.has('Authorization')).toBe(false);
    assetReq.flush({});
    loginReq.flush({});
    await Promise.all([asset, login]);
  });

  it('refreshes ONCE for concurrent 401s and retries every request with the new token', async () => {
    session.start(pair(1));
    const a = firstValueFrom(http.get('/api/v1/routines'));
    const b = firstValueFrom(http.get('/api/v1/programs'));

    httpMock.expectOne('/api/v1/routines').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/v1/programs').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();

    const refresh = httpMock.expectOne(REFRESH_URL); // throws if there were two
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush(pair(2));
    await settle();

    const retriedA = httpMock.expectOne('/api/v1/routines');
    const retriedB = httpMock.expectOne('/api/v1/programs');
    expect(retriedA.request.headers.get('Authorization')).toBe('Bearer access-2');
    expect(retriedB.request.headers.get('Authorization')).toBe('Bearer access-2');
    retriedA.flush(['a']);
    retriedB.flush(['b']);

    expect(await a).toEqual(['a']);
    expect(await b).toEqual(['b']);
    expect(TestBed.inject(TokenStorage).get()).toBe('refresh-2');
  });

  it('queues requests made while a refresh is in flight', async () => {
    session.start(pair(1));
    const first = firstValueFrom(http.get('/api/v1/routines'));
    httpMock.expectOne('/api/v1/routines').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();
    const refresh = httpMock.expectOne(REFRESH_URL);

    const queued = firstValueFrom(http.get('/api/v1/stats/summary'));
    await settle();
    httpMock.expectNone('/api/v1/stats/summary'); // waiting, not sent with the stale token

    refresh.flush(pair(2));
    await settle();

    const queuedReq = httpMock.expectOne('/api/v1/stats/summary');
    expect(queuedReq.request.headers.get('Authorization')).toBe('Bearer access-2');
    queuedReq.flush({});
    httpMock.expectOne('/api/v1/routines').flush([]);
    await Promise.all([first, queued]);
  });

  it('restores the access token from the stored refresh token before the first call', async () => {
    TestBed.inject(TokenStorage).set('refresh-1');
    const response = firstValueFrom(http.get('/api/v1/users/me'));
    await settle();

    httpMock.expectOne(REFRESH_URL).flush(pair(2));
    await settle();

    const req = httpMock.expectOne('/api/v1/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-2');
    req.flush({});
    await response;
  });

  it('ends the session when the refresh is rejected and propagates the original 401', async () => {
    session.start(pair(1));
    const response = firstValueFrom(http.get('/api/v1/routines'));

    httpMock.expectOne('/api/v1/routines').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();
    httpMock
      .expectOne(REFRESH_URL)
      .flush(
        { statusCode: 401, code: 'REFRESH_TOKEN_REUSED', message: '' },
        { status: 401, statusText: 'Unauthorized' },
      );

    await expect(response).rejects.toMatchObject({ status: 401, url: '/api/v1/routines' });
    expect(auth.handleSessionExpired).toHaveBeenCalledOnce();
    expect(session.accessToken()).toBeNull();
    expect(TestBed.inject(TokenStorage).get()).toBeNull();
  });

  it('keeps the refresh token when the refresh fails for a network reason', async () => {
    session.start(pair(1));
    const response = firstValueFrom(http.get('/api/v1/routines'));

    httpMock.expectOne('/api/v1/routines').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();
    httpMock.expectOne(REFRESH_URL).error(new ProgressEvent('error'), { status: 0 });

    await expect(response).rejects.toMatchObject({ status: 401 });
    expect(auth.handleSessionExpired).not.toHaveBeenCalled();
    expect(TestBed.inject(TokenStorage).get()).toBe('refresh-1');
  });
});
