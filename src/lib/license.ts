import { parseJwtClaims } from "./oauth";

// ---------------------------------------------------------------------------
// Server-side: check JWT for license_id claim
// ---------------------------------------------------------------------------
export function hasLicenseInJwt(token: string): boolean {
  if (!token) return false;
  const claims = parseJwtClaims(token);
  if (!claims) return false;
  return typeof claims.license_id === "string" && claims.license_id.length > 0;
}

// ---------------------------------------------------------------------------
// Client-side: read cc_has_license cookie
// ---------------------------------------------------------------------------
export function getLicenseStatusFromCookie(): boolean {
  if (typeof document === "undefined") return false;
  const match = document.cookie.match(/(?:^|;\s*)cc_has_license=([^;]*)/);
  return match ? match[1] === "1" : false;
}

// ---------------------------------------------------------------------------
// Server-side: link license key via bpsai-support
// ---------------------------------------------------------------------------
const SUPPORT_API_URL = () => process.env.SUPPORT_API_URL ?? "";

export async function linkLicense(
  accessToken: string,
  licenseKey: string,
): Promise<{ linked: boolean; license_id: string }> {
  const res = await fetch(`${SUPPORT_API_URL()}/users/me/license`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ license_key: licenseKey }),
  });

  if (!res.ok) {
    let errorMessage = `License link failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errorMessage = body.error;
    } catch {
      // Response is not JSON — use status-based fallback
    }
    throw new Error(errorMessage);
  }

  return res.json();
}
