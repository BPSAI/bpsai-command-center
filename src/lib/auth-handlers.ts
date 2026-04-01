import { randomBytes } from "crypto";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildZohoAuthUrl,
  exchangeCodeForTokens,
  exchangeForPortalSession,
  revokePortalSession,
} from "./oauth";

// ---------------------------------------------------------------------------
// Login redirect — builds Zoho OAuth URL with PKCE
// ---------------------------------------------------------------------------
export async function buildLoginRedirect(redirectUri: string) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = randomBytes(16).toString("hex");

  const authUrl = buildZohoAuthUrl({
    codeChallenge,
    state,
    redirectUri,
  });

  return { authUrl, codeVerifier, state };
}

// ---------------------------------------------------------------------------
// Callback — exchange auth code for portal JWT session
// ---------------------------------------------------------------------------
export async function handleCallback(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  // Step 1: Exchange auth code for Zoho tokens
  const zohoTokens = await exchangeCodeForTokens({
    code: params.code,
    codeVerifier: params.codeVerifier,
    redirectUri: params.redirectUri,
  });

  // Step 2: Exchange Zoho token for portal JWT session
  const portalSession = await exchangeForPortalSession(
    zohoTokens.access_token,
  );

  return {
    portalAccessToken: portalSession.access_token,
    portalRefreshToken: portalSession.refresh_token,
    expiresIn: portalSession.expires_in,
  };
}

// ---------------------------------------------------------------------------
// Logout — revoke portal session (best-effort), return clear instructions
// ---------------------------------------------------------------------------
export async function handleLogout(refreshToken: string | null) {
  if (refreshToken) {
    await revokePortalSession(refreshToken);
  }

  return {
    clearCookies: true,
    redirectTo: "/login",
  };
}
