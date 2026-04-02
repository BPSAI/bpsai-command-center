import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleCallback } from "@/lib/auth-handlers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  parseJwtClaims,
} from "@/lib/oauth";
import { hasLicenseInJwt } from "@/lib/license";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = body?.code ?? null;
  const state = body?.state ?? null;

  if (!code || !state) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("pkce_verifier")?.value;

  if (!savedState || savedState !== state) {
    return new NextResponse("Invalid state parameter", { status: 400 });
  }
  if (!codeVerifier) {
    return new NextResponse("Missing PKCE verifier", { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return new NextResponse("NEXT_PUBLIC_APP_URL is not configured", { status: 500 });
  }
  const redirectUri = `${appUrl}/auth/callback`;

  try {
    const result = await handleCallback({
      code,
      codeVerifier,
      redirectUri,
    });

    const isProduction = process.env.NODE_ENV === "production";

    // Set portal JWT cookies
    cookieStore.set(ACCESS_TOKEN_COOKIE, result.portalAccessToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    cookieStore.set(REFRESH_TOKEN_COOKIE, result.portalRefreshToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    // Set operator cookie for client JS
    const claims = parseJwtClaims(result.portalAccessToken);
    const operator = claims?.display_name || claims?.email || claims?.sub || "";
    cookieStore.set("operator", operator, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: isProduction,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    // Set license status cookie for client JS
    cookieStore.set(
      "cc_has_license",
      hasLicenseInJwt(result.portalAccessToken) ? "1" : "0",
      { path: "/", httpOnly: false, sameSite: "lax", secure: isProduction, maxAge: ACCESS_TOKEN_MAX_AGE },
    );

    // Clean up PKCE cookies
    cookieStore.set("pkce_verifier", "", { maxAge: 0, path: "/" });
    cookieStore.set("oauth_state", "", { maxAge: 0, path: "/" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return new NextResponse(message, { status: 401 });
  }
}
