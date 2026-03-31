import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";

const AUTHORIZED_USERS_RAW = process.env.AUTHORIZED_USERS ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  const key = "timing-safe-compare";
  const ha = createHmac("sha256", key).update(a).digest();
  const hb = createHmac("sha256", key).update(b).digest();
  return cryptoTimingSafeEqual(ha, hb);
}

/** Parse AUTHORIZED_USERS env var: "user1:pass1,user2:pass2" */
function parseAuthorizedUsers(raw: string): Map<string, string> {
  const users = new Map<string, string>();
  if (!raw.trim()) return users;
  for (const entry of raw.split(",")) {
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) continue;
    const user = entry.slice(0, colonIdx).trim();
    const pass = entry.slice(colonIdx + 1).trim();
    if (user) users.set(user, pass);
  }
  return users;
}

const authorizedUsers = parseAuthorizedUsers(AUTHORIZED_USERS_RAW);

/** Authenticate and return username, or null if invalid. */
function authenticateUser(request: NextRequest): string | null {
  // Dev: if no users configured, skip auth
  if (authorizedUsers.size === 0) {
    if (process.env.NODE_ENV === "production") return null;
    return "dev";
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return null;

  const decoded = atob(auth.slice(6));
  const colonIdx = decoded.indexOf(":");
  if (colonIdx === -1) return null;

  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  const expectedPass = authorizedUsers.get(user);
  if (expectedPass === undefined) return null;
  if (!timingSafeEqual(pass, expectedPass)) return null;

  return user;
}

export function middleware(request: NextRequest) {
  // Production guard: refuse to serve if auth is not configured
  if (process.env.NODE_ENV === "production" && authorizedUsers.size === 0) {
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  // Logout: clear the operator cookie and force re-auth
  if (request.nextUrl.pathname === "/api/logout") {
    const response = new NextResponse("Logged out", { status: 200 });
    response.cookies.set("operator", "", { maxAge: 0, path: "/" });
    return response;
  }

  const operator = authenticateUser(request);
  if (!operator) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Command Center"' },
    });
  }

  // Forward operator as a request header so API routes can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-operator", operator);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Also set a cookie so client JS can read the operator name
  response.cookies.set("operator", operator, {
    path: "/",
    httpOnly: false, // client JS needs to read it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
