import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { AdminExerciseGuideDto } from '../../../api/models/admin-exercise-guide-dto';
import { Notifier } from '../../../core/notify/notifier';
import { ImageRejectedError, ImageUpload, UploadEvent } from '../../../shared/media/image-upload';
import { PendingGuides } from './pending-guides';

const stored = (id: string): AdminExerciseGuideDto => ({
  id,
  kind: 'image',
  publicId: `p/${id}`,
  format: 'png',
  width: 1,
  height: 1,
  bytes: 1,
  caption: {},
  url: `https://cdn/${id}.png`,
});

const file = (name: string) => new File([new Uint8Array(4)], name, { type: 'image/png' });

describe('PendingGuides', () => {
  let uploads: string[];
  let next: (file: File) => Observable<UploadEvent>;
  let notified: string[];
  let guides: PendingGuides;

  beforeEach(() => {
    uploads = [];
    notified = [];
    next = (f) =>
      of<UploadEvent[]>(
        { type: 'progress', percent: 50 },
        { type: 'done', image: { secureUrl: '', publicId: `up/${f.name}`, format: 'png' } },
      );
    const upload = {
      upload: (f: File, purpose: string) => {
        uploads.push(`${purpose}:${f.name}`);
        return next(f);
      },
    } as unknown as ImageUpload;
    const notifier = { info: (key: string) => notified.push(key) } as unknown as Notifier;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((f) => `blob:${(f as File).name}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    guides = new PendingGuides(upload, notifier);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picking only previews; it is dirty until saved', () => {
    guides.load([stored('a')]);
    expect(guides.dirty()).toBe(false);
    guides.add([file('b.png')]);
    expect(guides.items().map((d) => d.previewUrl)).toEqual(['https://cdn/a.png', 'blob:b.png']);
    expect(uploads).toEqual([]);
    expect(guides.dirty()).toBe(true);
  });

  it('keeps at most 6 files and says so', () => {
    guides.load([stored('a'), stored('b')]);
    guides.add(['1', '2', '3', '4', '5'].map((n) => file(`${n}.png`)));
    expect(guides.items()).toHaveLength(6);
    expect(guides.full()).toBe(true);
    expect(notified).toEqual(['admin.exercises.guides.tooMany']);
  });

  it('uploads only new files, once, with the guide signature', async () => {
    guides.load([stored('a')]);
    guides.add([file('b.png'), file('c.png')]);
    expect(await guides.uploadPending()).toBe(true);
    expect(uploads).toEqual(['exercise_guide:b.png', 'exercise_guide:c.png']);
    expect(guides.items().map((d) => d.publicId)).toEqual(['p/a', 'up/b.png', 'up/c.png']);
    expect(guides.uploading()).toBeNull();

    // A retry (e.g. the exercise save failed) doesn't upload again.
    expect(await guides.uploadPending()).toBe(true);
    expect(uploads).toHaveLength(2);
  });

  it('a rejected file stops the upload and is reported', async () => {
    guides.add([file('big.png'), file('ok.png')]);
    next = () => throwError(() => new ImageRejectedError('tooLarge'));
    expect(await guides.uploadPending()).toBe(false);
    expect(notified).toEqual(['admin.exercises.guides.tooLarge']);
    expect(uploads).toHaveLength(1);
    expect(guides.uploading()).toBeNull();
  });

  it('INVALID_GUIDE_ASSET: shows the reason and re-uploads new files next time', async () => {
    guides.load([stored('a')]);
    guides.add([file('b.png')]);
    await guides.uploadPending();
    guides.rejected(
      new HttpErrorResponse({
        status: 400,
        error: { code: 'INVALID_GUIDE_ASSET', details: { reason: 'format' } },
      }),
    );
    expect(guides.rejection()).toBe('admin.exercises.guides.reasons.format');
    expect(guides.items().map((d) => d.publicId)).toEqual(['p/a', null]);
  });

  it('other API errors keep the uploads for the retry', async () => {
    guides.add([file('b.png')]);
    await guides.uploadPending();
    guides.rejected(new HttpErrorResponse({ status: 500, error: { code: 'INTERNAL_ERROR' } }));
    expect(guides.rejection()).toBeNull();
    expect(guides.items()[0]!.publicId).toBe('up/b.png');
  });

  it('loading what the API saved clears the pending state and frees previews', () => {
    guides.add([file('b.png')]);
    guides.load([stored('a'), stored('b')]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:b.png');
    expect(guides.dirty()).toBe(false);
    expect(guides.rejection()).toBeNull();
  });
});
