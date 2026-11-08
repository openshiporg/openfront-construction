/**
 * Date-only construction facts (due dates, log dates, through dates, period ends) are calendar days on the
 * project's calendar, not instants. They are stored at 12:00 UTC so the stored UTC date is the day that was typed
 * in every zone from UTC-11 to UTC+11, and deadlines are judged at the end of that day in `Project.timezone`.
 */
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const INSTANT_DAY = /^(\d{4})-(\d{2})-(\d{2})T/;

function realDay(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/** Parses a command date. "yyyy-MM-dd" becomes that calendar day at 12:00 UTC; an ISO instant is kept as an
 * instant. Impossible days (2027-02-30) are refused instead of rolling into the next month. */
export function parseCommandDate(value: string | null | undefined, label: string): Date | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const dayOnly = DAY.exec(text);
  if (dayOnly) {
    const date = realDay(Number(dayOnly[1]), Number(dayOnly[2]), Number(dayOnly[3]));
    if (!date) throw new Error(`${label} must be a real calendar date`);
    return date;
  }
  const prefix = INSTANT_DAY.exec(text);
  if (prefix && !realDay(Number(prefix[1]), Number(prefix[2]), Number(prefix[3]))) throw new Error(`${label} must be a real calendar date`);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date`);
  return date;
}

/** The stored calendar day ("yyyy-MM-dd"). Legacy rows saved at 00:00 UTC and current rows at 12:00 UTC both
 * carry the typed day in their UTC date. */
export function calendarDayKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function zoneOffsetMs(instant: number, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return wall - Math.floor(instant / 1000) * 1000;
}

function validZone(timeZone: string | null | undefined) {
  try {
    if (timeZone) { new Intl.DateTimeFormat("en-US", { timeZone }); return timeZone; }
  } catch { /* fall through */ }
  return "America/New_York";
}

/** First instant after the calendar day `value` ends in `timeZone` (local midnight starting the next day). */
export function calendarDayEndsAt(value: Date | string, timeZone: string | null | undefined): Date {
  const zone = validZone(timeZone);
  const [year, month, day] = calendarDayKey(value).split("-").map(Number);
  const nextMidnightWall = Date.UTC(year, month - 1, day + 1);
  let instant = nextMidnightWall - zoneOffsetMs(nextMidnightWall, zone);
  instant = nextMidnightWall - zoneOffsetMs(instant, zone);
  return new Date(instant);
}

/** True once the whole due day has passed on the project's calendar. */
export function calendarDayHasPassed(value: Date | string, timeZone: string | null | undefined, now = Date.now()): boolean {
  return calendarDayEndsAt(value, timeZone).getTime() <= now;
}
