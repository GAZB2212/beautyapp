/**
 * Salon-local date and time helpers. Appointments are stored as UTC instants; salons and
 * clients think in the salon's local calendar, so every conversion names the time zone.
 * Built on Intl only (no date library) to keep the booking page small.
 */

/** A calendar day in the salon's time zone, "YYYY-MM-DD". */
export type DateKey = string;

const partsCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

function zonedParts(instant: Date, timeZone: string) {
  const p: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The salon-local calendar day an instant falls on. */
export function dateKeyOf(instant: Date | string, timeZone: string): DateKey {
  const p = zonedParts(new Date(instant), timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function todayKey(timeZone: string, now: Date = new Date()): DateKey {
  return dateKeyOf(now, timeZone);
}

export function addDays(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday, matching the database convention. */
export function weekdayOf(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The instant at which the salon's clocks read `key` `time` ("HH:MM"). */
export function zonedTimeToInstant(key: DateKey, time: string, timeZone: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  // Start from "as if UTC", then correct by the zone's offset at that moment (twice, for DST edges).
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/** "9:30 am" style clock time in the salon's zone. */
export function formatTime(instant: Date | string, timeZone: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(instant))
    .replace(/\s?(am|pm)/i, (_, ap: string) => ` ${ap.toLowerCase()}`);
}

/** "Tuesday 24 November" */
export function formatDayLong(key: DateKey, locale = 'en-GB'): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** Pieces for a compact day chip: { weekday: "Tue", day: "24", month: "Nov" } */
export function dayChipParts(key: DateKey, locale = 'en-GB') {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o }).format(date);
  return { weekday: f({ weekday: 'short' }), day: f({ day: 'numeric' }), month: f({ month: 'short' }) };
}

/** Hour of day (0–23) in the salon's zone, for grouping slots into morning/afternoon/evening. */
export function hourOf(instant: Date | string, timeZone: string): number {
  return zonedParts(new Date(instant), timeZone).hour;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
