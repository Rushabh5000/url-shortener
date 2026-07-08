export function formatDate(d: Date | number | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function timeAgo(d: Date | number | null | undefined): string {
  if (!d) return "never";
  const date = d instanceof Date ? d : new Date(d);
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** Strip protocol for compact display of a destination URL. */
export function prettyUrl(url: string, max = 48): string {
  const stripped = url.replace(/^https?:\/\//, "");
  return stripped.length > max ? stripped.slice(0, max - 1) + "…" : stripped;
}
