import { format } from 'date-fns';

/** The quest-day key (YYYY-MM-DD) that `date` belongs to, given a boundary hour (0-23). */
export function dayKey(date: Date, boundaryHour: number): string {
  const d = new Date(date);
  if (d.getHours() < boundaryHour) {
    d.setDate(d.getDate() - 1);
  }
  return format(d, 'yyyy-MM-dd');
}

/** The previous quest-day key, given a key produced by dayKey(). */
export function previousDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return format(d, 'yyyy-MM-dd');
}

/** The `count` most recent day keys ending at `endKey` (inclusive), oldest first. */
export function recentDayKeys(endKey: string, count: number): string[] {
  const keys: string[] = [];
  let cursor = endKey;
  for (let i = 0; i < count; i++) {
    keys.push(cursor);
    cursor = previousDayKey(cursor);
  }
  return keys.reverse();
}

/** Day-of-week for a day key, 0=Sunday. */
export function dayOfWeek(key: string): number {
  return new Date(`${key}T00:00:00`).getDay();
}

/** Whole days from `fromKey` to `toKey`; negative if `toKey` is earlier. */
export function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00`).getTime();
  const to = new Date(`${toKey}T00:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** The next boundary instant strictly after `date`. */
export function nextBoundary(date: Date, boundaryHour: number): Date {
  const b = new Date(date);
  b.setHours(boundaryHour, 0, 0, 0);
  if (date.getTime() >= b.getTime()) {
    b.setDate(b.getDate() + 1);
  }
  return b;
}

export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
