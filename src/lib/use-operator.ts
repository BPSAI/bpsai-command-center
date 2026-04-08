export function getOperatorFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)operator=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function getOperatorIdFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)cc_operator_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}
