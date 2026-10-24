import { HttpErrorResponse } from '@angular/common/http';
import { AdminExerciseGuideDto } from '../../../api/models/admin-exercise-guide-dto';
import {
  GuideDraft,
  captionIssues,
  fromStoredGuide,
  invalidGuideReasonKey,
  moveDraft,
  sameGuides,
  toReplaceGuidesDto,
} from './guide-drafts';

const stored = (id: string, caption: Record<string, string> = {}): AdminExerciseGuideDto => ({
  id,
  kind: 'animation',
  publicId: `gymapp/dev/exercises/guides/${id}`,
  format: 'gif',
  width: 480,
  height: 480,
  bytes: 900_000,
  caption,
  url: `https://res.cloudinary.com/demo/image/upload/q_auto/gymapp/dev/exercises/guides/${id}.gif`,
});

const picked = (key: string): GuideDraft => ({
  key,
  publicId: null,
  file: new File([new Uint8Array(4)], `${key}.png`, { type: 'image/png' }),
  previewUrl: `blob:${key}`,
  kind: null,
  caption: { es: '', en: '' },
});

const keys = (list: GuideDraft[]) => list.map((d) => d.key);

describe('guide drafts', () => {
  it('a stored guide keeps its file, kind and every configured language', () => {
    const draft = fromStoredGuide(stored('g1', { es: 'Baja' }));
    expect(draft).toMatchObject({
      key: 'g1',
      publicId: 'gymapp/dev/exercises/guides/g1',
      file: null,
      kind: 'animation',
    });
    expect(draft.previewUrl).toContain('/g1.gif');
    expect(draft.caption).toEqual({ es: 'Baja', en: '' });
  });

  it('moves rows within bounds only', () => {
    const list = [picked('a'), picked('b'), picked('c')];
    expect(keys(moveDraft(list, 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(keys(moveDraft(list, 'b', 1))).toEqual(['a', 'c', 'b']);
    expect(keys(moveDraft(list, 'a', -1))).toEqual(['a', 'b', 'c']);
    expect(keys(moveDraft(list, 'c', 1))).toEqual(['a', 'b', 'c']);
    expect(keys(moveDraft(list, 'missing', 1))).toEqual(['a', 'b', 'c']);
  });

  it('a caption is optional, but once written it needs the default language', () => {
    const ok = { ...picked('ok'), caption: { es: 'Baja', en: '' } };
    const empty = picked('empty');
    const onlyEn = { ...picked('onlyEn'), caption: { es: ' ', en: 'Lower' } };
    const long = { ...picked('long'), caption: { es: 'x'.repeat(201), en: '' } };
    expect(captionIssues([ok, empty, onlyEn, long])).toEqual(['onlyEn', 'long']);
  });

  it('sends public ids in order, with trimmed captions and no empty ones', () => {
    const list = [
      { ...picked('a'), publicId: 'p/a', caption: { es: ' Baja ', en: '' } },
      { ...fromStoredGuide(stored('b')) },
    ];
    expect(toReplaceGuidesDto(list)).toEqual({
      guides: [
        { publicId: 'p/a', caption: { es: 'Baja' } },
        { publicId: 'gymapp/dev/exercises/guides/b' },
      ],
    });
    expect(() => toReplaceGuidesDto([picked('c')])).toThrow();
  });

  it('detects changes: order, caption, removal and picked files', () => {
    const guides = [stored('a', { es: 'Uno' }), stored('b')];
    const list = guides.map(fromStoredGuide);
    expect(sameGuides(guides, list)).toBe(true);
    expect(sameGuides(guides, moveDraft(list, 'b', -1))).toBe(false);
    expect(sameGuides(guides, [list[0]!, { ...list[1]!, caption: { es: 'Dos' } }])).toBe(false);
    expect(sameGuides(guides, [list[0]!])).toBe(false);
    expect(sameGuides([], [picked('c')])).toBe(false);
  });

  it('maps INVALID_GUIDE_ASSET reasons to dictionary keys; other errors to null', () => {
    const error = (body: unknown) => new HttpErrorResponse({ status: 400, error: body });
    expect(
      invalidGuideReasonKey(error({ code: 'INVALID_GUIDE_ASSET', details: { reason: 'size' } })),
    ).toBe('admin.exercises.guides.reasons.size');
    expect(
      invalidGuideReasonKey(error({ code: 'INVALID_GUIDE_ASSET', details: { reason: 'nope' } })),
    ).toBeNull();
    expect(invalidGuideReasonKey(error({ code: 'VALIDATION_ERROR' }))).toBeNull();
    expect(invalidGuideReasonKey(new Error('boom'))).toBeNull();
  });
});
