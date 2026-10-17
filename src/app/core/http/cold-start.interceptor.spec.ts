import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ColdStartService, SLOW_REQUEST_MS } from '../cold-start/cold-start.service';
import { MAX_AUTO_RETRIES, backoffMs, coldStartInterceptor } from './cold-start.interceptor';

describe('coldStartInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let coldStart: ColdStartService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([coldStartInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    coldStart = TestBed.inject(ColdStartService);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('shows the banner when the first request takes longer than 3 s', () => {
    http.get('/api/v1/health').subscribe();
    vi.advanceTimersByTime(SLOW_REQUEST_MS - 1);
    expect(coldStart.state()).toBe('idle');

    vi.advanceTimersByTime(1);
    expect(coldStart.state()).toBe('waking');

    httpMock.expectOne('/api/v1/health').flush({});
    expect(coldStart.state()).toBe('idle');
  });

  it('does not show the banner for slow requests once the server is known to be awake', () => {
    coldStart.markAwake();
    http.get('/api/v1/export').subscribe();
    vi.advanceTimersByTime(SLOW_REQUEST_MS * 2);
    expect(coldStart.state()).toBe('idle');
    httpMock.expectOne('/api/v1/export').flush({});
  });

  it('retries 503 from the proxy with backoff until the server answers', () => {
    let body: unknown;
    http.get('/api/v1/routines').subscribe((b) => (body = b));

    httpMock.expectOne('/api/v1/routines').flush(null, { status: 503, statusText: 'Unavailable' });
    expect(coldStart.state()).toBe('waking');

    vi.advanceTimersByTime(backoffMs(1));
    httpMock.expectOne('/api/v1/routines').flush(null, { status: 502, statusText: 'Bad Gateway' });

    vi.advanceTimersByTime(backoffMs(2));
    httpMock.expectOne('/api/v1/routines').flush(['ok']);

    expect(body).toEqual(['ok']);
    expect(coldStart.state()).toBe('idle');
  });

  it('waits for the user after the automatic retries and re-sends on retry()', () => {
    let body: unknown;
    http.get('/api/v1/routines').subscribe((b) => (body = b));

    for (let attempt = 1; attempt <= MAX_AUTO_RETRIES; attempt++) {
      httpMock.expectOne('/api/v1/routines').error(new ProgressEvent('error'), { status: 0 });
      vi.advanceTimersByTime(backoffMs(attempt));
    }
    httpMock.expectOne('/api/v1/routines').error(new ProgressEvent('error'), { status: 0 });
    expect(coldStart.state()).toBe('failed');

    vi.advanceTimersByTime(60_000);
    httpMock.expectNone('/api/v1/routines'); // pending until the user acts

    coldStart.retry();
    httpMock.expectOne('/api/v1/routines').flush(['ok']);
    expect(body).toEqual(['ok']);
    expect(coldStart.state()).toBe('idle');
  });

  it('does not retry a POST that may have reached the app (status 0)', () => {
    let status: number | undefined;
    http.post('/api/v1/routines', {}).subscribe({ error: (e) => (status = e.status) });

    httpMock.expectOne('/api/v1/routines').error(new ProgressEvent('error'), { status: 0 });
    vi.advanceTimersByTime(backoffMs(1));
    httpMock.expectNone('/api/v1/routines');
    expect(status).toBe(0);
  });

  it('does not retry application errors', () => {
    let status: number | undefined;
    http.get('/api/v1/routines/x').subscribe({ error: (e) => (status = e.status) });
    httpMock.expectOne('/api/v1/routines/x').flush(null, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
    expect(coldStart.state()).toBe('idle');
  });

  it('ignores non-API requests', () => {
    http.get('assets/i18n/es.json').subscribe();
    vi.advanceTimersByTime(SLOW_REQUEST_MS * 2);
    expect(coldStart.state()).toBe('idle');
    httpMock.expectOne('assets/i18n/es.json').flush({});
  });
});
