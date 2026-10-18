import { ProgressPhotoDto } from '../../api/models/progress-photo-dto';
import { exportRequest } from '../profile/export-card';
import { groupByDay, takenAtFor } from './photos.store';

const photo = (id: string, view: ProgressPhotoDto['view'], takenAt: Date): ProgressPhotoDto => ({
  id,
  view,
  takenAt: takenAt.toISOString(),
  url: `https://res.cloudinary.com/x/${id}.jpg`,
  publicId: id,
  notes: '',
});

describe('progress photos', () => {
  it('groups by LOCAL day, newest first, front → side → back', () => {
    const days = groupByDay([
      photo('b1', 'back', new Date(2026, 9, 1, 9)),
      photo('f2', 'front', new Date(2026, 9, 8, 23, 30)),
      photo('f1', 'front', new Date(2026, 9, 1, 9)),
      photo('s1', 'side', new Date(2026, 9, 1, 9)),
    ]);
    expect(days.map((d) => d.date)).toEqual(['2026-10-08', '2026-10-01']);
    expect(days[1].photos.map((p) => p.id)).toEqual(['f1', 's1', 'b1']);
  });

  it('a past day is taken at local noon; today keeps the time', () => {
    const now = new Date(2026, 9, 18, 7, 15);
    expect(takenAtFor('2026-10-18', now)).toBe(now.toISOString());
    expect(takenAtFor('2026-10-02', now)).toBe(new Date(2026, 9, 2, 12).toISOString());
  });
});

describe('data export', () => {
  it('JSON has everything; CSV is one dataset per file', () => {
    expect(exportRequest('json', '2026-10-18')).toEqual({
      params: { format: 'json' },
      filename: 'saiyagym-export-2026-10-18.json',
    });
    expect(exportRequest('measurements', '2026-10-18')).toEqual({
      params: { format: 'csv', dataset: 'measurements' },
      filename: 'saiyagym-measurements-2026-10-18.csv',
    });
  });
});
