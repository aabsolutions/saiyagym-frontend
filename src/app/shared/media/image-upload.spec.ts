import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UploadSignatureDto } from '../../api/models/upload-signature-dto';
import { ImageRejectedError, ImageUpload, UploadEvent, checkImage } from './image-upload';

const signature: UploadSignatureDto = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload',
  apiKey: 'public-key',
  signature: 'sig',
  maxFileSizeBytes: 1000,
  expiresAt: '2030-01-01T00:00:00.000Z',
  params: {
    timestamp: 123,
    public_id: 'users/u1/exercises/abc',
    asset_folder: 'users/u1/exercises',
    allowed_formats: 'jpg,png,webp',
    transformation: 'c_limit,w_1600',
  },
};

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('checkImage', () => {
  it('accepts allowed formats, treating jpeg as jpg', () => {
    expect(() => checkImage(file('a.jpeg', 'image/jpeg'), 1000, 'jpg,png')).not.toThrow();
    expect(() => checkImage(file('a.png', 'image/png'), 1000, 'jpg, PNG')).not.toThrow();
  });

  it('rejects big files and other formats before uploading', () => {
    expect(() => checkImage(file('a.png', 'image/png', 2000), 1000, 'png')).toThrow(
      new ImageRejectedError('tooLarge'),
    );
    expect(() => checkImage(file('a.gif', 'image/gif'), 1000, 'jpg,png')).toThrow(
      new ImageRejectedError('format'),
    );
  });
});

describe('ImageUpload', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('asks the API for a signature, then posts the file with every signed field to Cloudinary', async () => {
    const events: UploadEvent[] = [];
    TestBed.inject(ImageUpload)
      .upload(file('a.png', 'image/png'), 'custom_exercise_image')
      .subscribe((e) => events.push(e));

    const sign = httpMock.expectOne('/api/v1/media/upload-signature');
    expect(sign.request.body).toEqual({ purpose: 'custom_exercise_image' });
    sign.flush(signature);
    await settle();

    const upload = httpMock.expectOne(signature.uploadUrl);
    const body = upload.request.body as FormData;
    expect(body.get('api_key')).toBe('public-key');
    expect(body.get('signature')).toBe('sig');
    expect(body.get('timestamp')).toBe('123');
    expect(body.get('public_id')).toBe('users/u1/exercises/abc');
    // Signed: it must reach Cloudinary unchanged, or the signature breaks.
    expect(body.get('asset_folder')).toBe('users/u1/exercises');
    expect(body.get('transformation')).toBe('c_limit,w_1600');
    expect(body.get('file')).toBeInstanceOf(File);
    expect(upload.request.headers.has('Authorization')).toBe(false);

    upload.flush({ secure_url: 'https://res.cloudinary.com/x.png', public_id: 'p', format: 'png' });
    expect(events.at(-1)).toEqual({
      type: 'done',
      image: { secureUrl: 'https://res.cloudinary.com/x.png', publicId: 'p', format: 'png' },
    });
  });

  it('never uploads a file that breaks the signed limits', async () => {
    let error: unknown;
    TestBed.inject(ImageUpload)
      .upload(file('big.png', 'image/png', 5000), 'custom_exercise_image')
      .subscribe({ error: (e) => (error = e) });

    httpMock.expectOne('/api/v1/media/upload-signature').flush(signature);
    await settle();

    httpMock.expectNone(signature.uploadUrl);
    expect(error).toEqual(new ImageRejectedError('tooLarge'));
  });
});
