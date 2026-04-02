import { randomBytes, createHash } from "crypto";

// ---------------------------------------------------------------------------
// Cookie constants
// ---------------------------------------------------------------------------
export const ACCESS_TOKEN_COOKIE = "cc_access_token";
export const REFRESH_TOKEN_COOKIE = "cc_refresh_token";
export const ACCESS_TOKEN_MAX_AGE = 30 * 60; // 30 min
export const REFRESH_TOKEN_MAX_AGE = 12 * 60 * 60; // 12 hr

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const SUPPORT_API_URL = () => process.env.SUPPORT_API_URL ?? "";
const ZOHO_CLIENT_ID = () => process.env.ZOHO_CLIENT_ID ?? "";
const ZOHO_ACCOUNTS_DOMAIN = "https://accounts.zoho.com";

// ---------------------------------------------------------------------------
// Env validation — call before auth flows
// ---------------------------------------------------------------------------
export function requireAuthEnv(): void {
  if (!process.env.SUPPORT_API_URL) {
    throw new Error("SUPPORT_API_URL is not set — cannot run auth flow");
  }
  if (!process.env.ZOHO_CLIENT_ID) {
    throw new Error("ZOHO_CLIENT_ID is not set — cannot run auth flow");
  }
}

// ---------------------------------------------------------------------------
// PKCE helpers (RFC 7636)
// ---------------------------------------------------------------------------
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  return createHash("sha256").update(verifier).digest("base64url");
}

// ---------------------------------------------------------------------------
// Zoho OAuth URL builder
// ---------------------------------------------------------------------------
export function buildZohoAuthUrl(params: {
  codeChallenge: string;
  state: string;
  redirectUri: string;
}): string {
  const url = new URL("/oauth/v2/auth", ZOHO_ACCOUNTS_DOMAIN);
  url.searchParams.set("client_id", ZOHO_CLIENT_ID());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange types
// ---------------------------------------------------------------------------
export interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
}

export interface PortalSessionResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ---------------------------------------------------------------------------
// Token exchange: auth code → Zoho tokens via bpsai-support
// ---------------------------------------------------------------------------
export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<ZohoTokenResponse> {
  const res = await fetch(`${SUPPORT_API_URL()}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Portal session: Zoho token → portal JWT
// ---------------------------------------------------------------------------
export async function exchangeForPortalSession(
  zohoToken: string,
): Promise<PortalSessionResponse> {
  const res = await fetch(`${SUPPORT_API_URL()}/auth/portal-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zoho_token: zohoToken }),
  });
  if (!res.ok) {
    throw new Error(`Portal session failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Portal refresh: refresh token → new tokens
// ---------------------------------------------------------------------------
export async function refreshPortalSession(
  refreshToken: string,
): Promise<PortalSessionResponse> {
  const res = await fetch(`${SUPPORT_API_URL()}/auth/portal-refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Portal refresh failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Portal revoke: best-effort revoke refresh token
// ---------------------------------------------------------------------------
export async function revokePortalSession(
  refreshToken: string,
): Promise<void> {
  try {
    await fetch(`${SUPPORT_API_URL()}/auth/portal-revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // Best-effort — ignore errors
  }
}

// ---------------------------------------------------------------------------
// JWT claim parsing (no verification — middleware trusts bpsai-support)
// ---------------------------------------------------------------------------
// SECURITY: parseJwtClaims does NOT verify the JWT signature. This is
// intentional — the token is issued by bpsai-support over a trusted
// server-to-server channel and stored in an httpOnly cookie that only our
// middleware reads. The trust boundary is between this app and bpsai-support;
// the JWT is never accepted from an untrusted source. If the deployment model
// changes (e.g. token accepted from client headers), signature verification
// MUST be added here.
export interface JwtClaims {
  sub: string;
  display_name: string;
  email: string;
  roles?: string[];
  exp: number;
  [key: string]: unknown;
}

export function parseJwtClaims(token: string): JwtClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Decode base64url payload
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
