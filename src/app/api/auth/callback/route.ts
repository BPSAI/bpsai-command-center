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

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

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

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/auth/callback`;

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
    });

    // Clean up PKCE cookies
    cookieStore.set("pkce_verifier", "", { maxAge: 0, path: "/" });
    cookieStore.set("oauth_state", "", { maxAge: 0, path: "/" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return new NextResponse(message, { status: 401 });
  }
}
