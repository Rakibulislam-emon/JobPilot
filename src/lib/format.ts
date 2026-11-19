export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(value?: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function relativeTime(value?: string | null): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function daysUntil(
  dateStr?: string | null,
  now: Date = new Date()
): number | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.slice(0, 10));
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const target = Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText));
  const targetDate = new Date(target);
  if (
    targetDate.getUTCFullYear() !== Number(yearText) ||
    targetDate.getUTCMonth() !== Number(monthText) - 1 ||
    targetDate.getUTCDate() !== Number(dayText)
  ) {
    return null;
  }

  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const todayValue = (type: string) =>
    Number(todayParts.find((part) => part.type === type)?.value);
  const today = Date.UTC(todayValue("year"), todayValue("month") - 1, todayValue("day"));

  return (target - today) / 86_400_000;
}

export function daysSince(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return null;
  return Math.round((Date.now() - d) / 86400000);
}

export function initials(text?: string): string {
  const t = (text ?? "").trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function truncate(text: string, n = 120): string {
  if (!text) return "";
  return text.length > n ? `${text.slice(0, n).trimEnd()}…` : text;
}
