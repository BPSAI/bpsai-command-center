import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  refreshPortalSession,
} from "./lib/oauth";
import { evaluateAuth } from "./lib/auth-middleware";

function cookieOpts(maxAge: number, isProduction: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    maxAge,
  };
}

export async function middleware(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";

  const accessToken =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken =
    request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  const result = evaluateAuth({
    pathname: request.nextUrl.pathname,
    accessToken,
    refreshToken,
  });

  // Public paths — pass through
  if (result.action === "skip") {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  if (result.action === "redirect_login") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Token near-expiry — attempt refresh
  if (result.action === "refresh") {
    try {
      const session = await refreshPortalSession(refreshToken!);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-operator", result.operator);

      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });
      response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        session.access_token,
        cookieOpts(ACCESS_TOKEN_MAX_AGE, isProduction),
      );
      response.cookies.set(
        REFRESH_TOKEN_COOKIE,
        session.refresh_token,
        cookieOpts(REFRESH_TOKEN_MAX_AGE, isProduction),
      );
      // Non-httpOnly cookie for client JS to read operator name
      response.cookies.set("operator", result.operator, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: isProduction,
      });
      return response;
    } catch {
      // Refresh failed — force re-login
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
      response.cookies.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
      response.cookies.set("operator", "", { maxAge: 0, path: "/" });
      return response;
    }
  }

  // Valid token — forward operator header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-operator", result.operator);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  // Keep operator cookie in sync for client JS
  response.cookies.set("operator", result.operator, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
