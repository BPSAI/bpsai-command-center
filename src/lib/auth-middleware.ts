import { parseJwtClaims } from "./oauth";

// Paths that bypass authentication entirely
export const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/health"];

// Refresh access token when it expires within this many seconds
export const REFRESH_THRESHOLD_SEC = 120;

export type AuthAction =
  | { action: "skip" }
  | { action: "allow"; operator: string }
  | { action: "refresh"; operator: string }
  | { action: "redirect_login" };

export function evaluateAuth(params: {
  pathname: string;
  accessToken: string | null;
  refreshToken: string | null;
}): AuthAction {
  const { pathname, accessToken, refreshToken } = params;

  // Public paths skip auth
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return { action: "skip" };
  }

  // No token at all → login
  if (!accessToken) {
    return { action: "redirect_login" };
  }

  // Parse JWT claims
  const claims = parseJwtClaims(accessToken);
  if (!claims) {
    return { action: "redirect_login" };
  }

  const operator =
    claims.display_name || claims.email || claims.sub || "unknown";
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = claims.exp - now;

  // Expired or near-expiry
  if (expiresIn <= REFRESH_THRESHOLD_SEC) {
    if (refreshToken) {
      return { action: "refresh", operator };
    }
    return { action: "redirect_login" };
  }

  return { action: "allow", operator };
}
