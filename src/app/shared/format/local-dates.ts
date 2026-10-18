/**
 * Local calendar dates as `YYYY-MM-DD` strings. Programs are scheduled on the user's LOCAL
 * days (the API takes local dates, never UTC timestamps), so no Date ever crosses the wire.
 */

const pad = (n: number) => String(n).padStart(2, '0');

const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Parses as LOCAL midnight (`new Date('2026-01-05')` would be UTC midnight). */
export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(now = new Date()): string {
  return toIso(now);
}

export function addDaysIso(iso: string, days: number): string {
  const date = fromIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso: string): number {
  const day = fromIso(iso).getDay();
  return day === 0 ? 7 : day;
}

/** Weekdays in display order for a user whose week starts on `firstDayOfWeek` (ISO). */
export function orderedWeekdays(firstDayOfWeek: number): number[] {
  return Array.from({ length: 7 }, (_, i) => ((firstDayOfWeek - 1 + i) % 7) + 1);
}

/** The 7 local dates of the week containing `iso`, starting on `firstDayOfWeek`. */
export function weekDatesIso(iso: string, firstDayOfWeek: number): string[] {
  const back = (isoWeekday(iso) - firstDayOfWeek + 7) % 7;
  const start = addDaysIso(iso, -back);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
}
