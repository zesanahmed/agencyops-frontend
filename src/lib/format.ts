const dateFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

/**
 * Project and sprint dates are calendar dates the backend stores as UTC midnight. Formatting them in
 * the viewer's time zone would show the previous day west of UTC, so these two helpers stay in UTC.
 */
const calendarFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
export function formatCalendarDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : calendarFmt.format(d);
}

/** ISO timestamp -> the `YYYY-MM-DD` an `<input type="date">` expects ("" when absent). */
export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` from a date input -> the UTC-midnight ISO string the backend stores. */
export function fromDateInputValue(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function timeAgo(value?: string | null, now: number = Date.now()): string {
  if (!value) return "";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.round((now - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(value);
}
