import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ExercisesService } from '../../api/services/exercises.service';
import { Notifier } from '../../core/notify/notifier';
import { ImageUpload, UploadEvent } from '../../shared/media/image-upload';
import { emptyExerciseForm } from './exercise-form';
import { ExerciseFormStore } from './exercise-form.store';

const URL_DONE = 'https://res.cloudinary.com/demo/image/upload/v1/gymapp/x.png';
const done: UploadEvent = {
  type: 'done',
  image: { secureUrl: URL_DONE, publicId: 'gymapp/x', format: 'png' },
};

describe('ExerciseFormStore image', () => {
  const upload = { upload: vi.fn() };
  const api = { exercisesControllerCreate: vi.fn() };
  let store: ExerciseFormStore;

  beforeEach(() => {
    upload.upload.mockReset();
    api.exercisesControllerCreate.mockReset();
    api.exercisesControllerCreate.mockResolvedValue({ id: 'ex-1' });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        ExerciseFormStore,
        { provide: ImageUpload, useValue: upload },
        { provide: ExercisesService, useValue: api },
        { provide: Notifier, useValue: { info: vi.fn() } },
      ],
    });
    store = TestBed.inject(ExerciseFormStore);
  });

  const file = () => new File(['x'], 'a.png', { type: 'image/png' });

  it('picking a file only previews it: nothing goes to Cloudinary', () => {
    store.selectImage(file());
    expect(upload.upload).not.toHaveBeenCalled();
    expect(store.shownImage()).toBe('blob:preview');
  });

  it('saving uploads first, then creates the exercise with the uploaded URL', async () => {
    upload.upload.mockReturnValue(of({ type: 'progress', percent: 50 }, done));
    store.selectImage(file());
    const model = { ...emptyExerciseForm(), name: 'Curl' };

    expect(await store.save(model)).toEqual({ id: 'ex-1' });
    expect(upload.upload).toHaveBeenCalledTimes(1);
    expect(api.exercisesControllerCreate.mock.calls[0][0].body.imageUrl).toBe(URL_DONE);
    expect(store.pendingFile()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('a failed upload saves nothing and keeps the picked file to retry', async () => {
    const failing = new Subject<UploadEvent>();
    upload.upload.mockReturnValue(failing);
    store.selectImage(file());
    const saving = store.save({ ...emptyExerciseForm(), name: 'Curl' });
    failing.error(new Error('network'));

    expect(await saving).toBeNull();
    expect(api.exercisesControllerCreate).not.toHaveBeenCalled();
    expect(store.pendingFile()).not.toBeNull();
  });

  it('without a picked file, saving uploads nothing', async () => {
    await store.save({ ...emptyExerciseForm(), name: 'Curl' });
    expect(upload.upload).not.toHaveBeenCalled();
    expect(api.exercisesControllerCreate.mock.calls[0][0].body).not.toHaveProperty('imageUrl');
  });
});
