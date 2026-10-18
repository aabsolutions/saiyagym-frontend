import { max, maxLength, min, required, schema, validate } from '@angular/forms/signals';
import { ProfileDto } from '../../api/models/profile-dto';
import { UpdateProfileDto } from '../../api/models/update-profile-dto';
import { todayIso } from '../format/local-dates';
import { UnitSystem, cmToIn, inToCm } from '../units/units';

export type Sex = NonNullable<ProfileDto['sex']>;
export type Level = NonNullable<ProfileDto['level']>;
export type Goal = NonNullable<ProfileDto['goal']>;

export const SEXES: readonly Sex[] = ['male', 'female', 'other'];
export const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'advanced'];
export const GOALS: readonly Goal[] = ['hypertrophy', 'powerlifting', 'both'];

/** API bounds for `heightCm` (UpdateProfileDto). */
const HEIGHT_CM = { min: 50, max: 272 } as const;
export const NAME_MAX = 80;

/**
 * Form model: what the inputs edit. `height` is in the user's display unit (cm or in);
 * `birthDate` is the native date input's `YYYY-MM-DD` ('' = not set).
 */
export interface ProfileFormModel {
  name: string;
  birthDate: string;
  sex: Sex | null;
  height: number | null;
  level: Level | null;
  goal: Goal | null;
}

export const EMPTY_PROFILE: Readonly<ProfileFormModel> = {
  name: '',
  birthDate: '',
  sex: null,
  height: null,
  level: null,
  goal: null,
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function heightBounds(units: UnitSystem): { min: number; max: number } {
  return units === 'imperial'
    ? { min: round1(cmToIn(HEIGHT_CM.min)), max: round1(cmToIn(HEIGHT_CM.max)) }
    : { ...HEIGHT_CM };
}

const displayHeight = (cm: number, units: UnitSystem) =>
  round1(units === 'imperial' ? cmToIn(cm) : cm);

export function toProfileModel(profile: ProfileDto, units: UnitSystem): ProfileFormModel {
  const cm = profile.heightCm;
  return {
    name: profile.name ?? '',
    birthDate: profile.birthDate ?? '',
    sex: profile.sex,
    height: cm === null ? null : displayHeight(cm, units),
    level: profile.level,
    goal: profile.goal,
  };
}

/**
 * Only metric goes to the API. Pass the stored profile so an untouched height keeps its
 * exact cm: in → cm → in rounding would otherwise drift (164 → 164.1) on every save.
 */
export function toUpdateProfileDto(
  model: ProfileFormModel,
  units: UnitSystem,
  stored?: ProfileDto,
): UpdateProfileDto {
  const height = model.height;
  const storedCm = stored?.heightCm ?? null;
  let heightCm: number | null;
  if (height === null || Number.isNaN(height)) heightCm = null;
  else if (storedCm !== null && displayHeight(storedCm, units) === height) heightCm = storedCm;
  else heightCm = round1(units === 'imperial' ? inToCm(height) : height);

  return {
    name: model.name.trim() || null,
    birthDate: model.birthDate || null,
    sex: model.sex,
    heightCm,
    level: model.level,
    goal: model.goal,
  };
}

export { todayIso } from '../format/local-dates';

export interface ProfileSchemaOptions {
  units: () => UnitSystem;
  /** Onboarding asks for level and goal; the profile page lets them stay empty. */
  requireTraining: boolean;
}

export const profileSchema = ({ units, requireTraining }: ProfileSchemaOptions) =>
  schema<ProfileFormModel>((path) => {
    maxLength(path.name, NAME_MAX);
    min(path.height, () => heightBounds(units()).min);
    max(path.height, () => heightBounds(units()).max);
    validate(path.birthDate, ({ value }) =>
      value() && value() > todayIso() ? { kind: 'futureDate' } : undefined,
    );
    if (requireTraining) {
      required(path.level);
      required(path.goal);
    }
  });
