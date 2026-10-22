import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UploadSignatureDto } from '../../api/models/upload-signature-dto';
import {
  AUDIO_DURATION_READER,
  AudioRejectedError,
  AudioUpload,
  AudioUploadEvent,
  MAX_SOUND_SECONDS,
  checkAudio,
  readAudioDuration,
} from './audio-upload';

const signature: UploadSignatureDto = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/demo/video/upload',
  apiKey: 'public-key',
  signature: 'sig',
  maxFileSizeBytes: 1000,
  expiresAt: '2030-01-01T00:00:00.000Z',
  // Sounds are signed without `transformation`.
  params: {
    timestamp: 123,
    public_id: 'gymapp/dev/sounds/abc',
    asset_folder: 'gymapp/dev/sounds',
    allowed_formats: 'mp3,wav,m4a,ogg,aac',
  },
};

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('checkAudio', () => {
  it('accepts a small file in an allowed format', () => {
    expect(() => checkAudio(file('a.mp3', 'audio/mpeg'), 1000, 'mp3,wav', 12)).not.toThrow();
    expect(() => checkAudio(file('a.WAV', 'audio/wav'), 1000, 'mp3,wav', 29.9)).not.toThrow();
  });

  it('rejects files over the signed byte limit', () => {
    expect(() => checkAudio(file('a.mp3', 'audio/mpeg', 2000), 1000, 'mp3', 5)).toThrow(
      new AudioRejectedError('tooLarge'),
    );
  });

  it('rejects other formats', () => {
    expect(() => checkAudio(file('a.flac', 'audio/flac'), 1000, 'mp3,wav', 5)).toThrow(
      new AudioRejectedError('format'),
    );
  });

  it('rejects 30 s or longer (iOS ignores those notification sounds)', () => {
    expect(MAX_SOUND_SECONDS).toBe(30);
    expect(() => checkAudio(file('a.mp3', 'audio/mpeg'), 1000, 'mp3', 30)).toThrow(
      new AudioRejectedError('tooLong'),
    );
    expect(() => checkAudio(file('a.mp3', 'audio/mpeg'), 1000, 'mp3', 45)).toThrow(
      new AudioRejectedError('tooLong'),
    );
  });

  it('rejects a file whose length could not be read', () => {
    expect(() => checkAudio(file('a.mp3', 'audio/mpeg'), 1000, 'mp3', Number.NaN)).toThrow(
      new AudioRejectedError('unreadable'),
    );
  });
});

describe('readAudioDuration', () => {
  type Listener = () => void;
  const fakeAudio = (outcome: 'loaded' | 'error', duration = 12.5) => {
    const listeners = new Map<string, Listener>();
    const audio = {
      duration,
      preload: '',
      src: '',
      addEventListener: (name: string, fn: Listener) => listeners.set(name, fn),
      load: () =>
        queueMicrotask(() => listeners.get(outcome === 'loaded' ? 'loadedmetadata' : 'error')?.()),
    };
    return audio as unknown as HTMLAudioElement;
  };
  const urls = { create: vi.fn(() => 'blob:x'), revoke: vi.fn() };

  it('reads the duration from loadedmetadata and frees the object URL', async () => {
    const seconds = await readAudioDuration(file('a.mp3', 'audio/mpeg'), {
      createAudio: () => fakeAudio('loaded', 12.5),
      createObjectUrl: urls.create,
      revokeObjectUrl: urls.revoke,
    });
    expect(seconds).toBe(12.5);
    expect(urls.revoke).toHaveBeenCalledWith('blob:x');
  });

  it('is NaN when the browser cannot decode the file', async () => {
    const seconds = await readAudioDuration(file('a.mp3', 'audio/mpeg'), {
      createAudio: () => fakeAudio('error'),
      createObjectUrl: urls.create,
      revokeObjectUrl: urls.revoke,
    });
    expect(seconds).toBeNaN();
  });
});

describe('AudioUpload', () => {
  let httpMock: HttpTestingController;
  let duration: number;

  beforeEach(() => {
    duration = 10;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUDIO_DURATION_READER, useValue: () => Promise.resolve(duration) },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('signs a rest_sound upload, then posts the file with every signed field', async () => {
    const events: AudioUploadEvent[] = [];
    TestBed.inject(AudioUpload)
      .upload(file('a.mp3', 'audio/mpeg'))
      .subscribe((e) => events.push(e));
    await settle();

    const sign = httpMock.expectOne('/api/v1/media/upload-signature');
    expect(sign.request.body).toEqual({ purpose: 'rest_sound' });
    sign.flush(signature);
    await settle();

    const upload = httpMock.expectOne(signature.uploadUrl);
    const body = upload.request.body as FormData;
    expect(body.get('signature')).toBe('sig');
    expect(body.get('public_id')).toBe('gymapp/dev/sounds/abc');
    expect(body.get('asset_folder')).toBe('gymapp/dev/sounds');
    expect(body.has('transformation')).toBe(false);
    expect(body.get('file')).toBeInstanceOf(File);
    expect(upload.request.headers.has('Authorization')).toBe(false);

    upload.flush({ secure_url: 'https://res.cloudinary.com/x.mp3', public_id: 'p', format: 'mp3' });
    expect(events.at(-1)).toEqual({ type: 'done', audio: { publicId: 'p', format: 'mp3' } });
  });

  it('never asks for a signature when the audio is too long', async () => {
    duration = 31;
    let error: unknown;
    TestBed.inject(AudioUpload)
      .upload(file('a.mp3', 'audio/mpeg'))
      .subscribe({ error: (e) => (error = e) });
    await settle();

    httpMock.expectNone('/api/v1/media/upload-signature');
    expect(error).toEqual(new AudioRejectedError('tooLong'));
  });

  it('never uploads a file over the signed byte limit', async () => {
    let error: unknown;
    TestBed.inject(AudioUpload)
      .upload(file('big.mp3', 'audio/mpeg', 5000))
      .subscribe({ error: (e) => (error = e) });
    await settle();

    httpMock.expectOne('/api/v1/media/upload-signature').flush(signature);
    await settle();

    httpMock.expectNone(signature.uploadUrl);
    expect(error).toEqual(new AudioRejectedError('tooLarge'));
  });
});
