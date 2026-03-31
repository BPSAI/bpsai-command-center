export function getOperatorFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)operator=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}
