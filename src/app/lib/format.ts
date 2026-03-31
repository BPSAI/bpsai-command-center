export function formatTime(ts: string, includeSeconds = false): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  if (includeSeconds) options.second = "2-digit";
  return d.toLocaleTimeString("en-GB", options);
}

export function formatDate(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}
