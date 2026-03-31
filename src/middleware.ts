import { NextRequest, NextResponse } from "next/server";

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? "";
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function isAuthenticated(request: NextRequest): boolean {
  // In production, BASIC_AUTH_PASS must be set
  if (!BASIC_AUTH_PASS) {
    if (process.env.NODE_ENV === "production") return false;
    return true; // dev: no password = auth disabled
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;

  const decoded = atob(auth.slice(6));
  const colonIdx = decoded.indexOf(":");
  if (colonIdx === -1) return false;

  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);
  return timingSafeEqual(user, BASIC_AUTH_USER) && timingSafeEqual(pass, BASIC_AUTH_PASS);
}

export function middleware(request: NextRequest) {
  // Production guard: refuse to serve if auth is not configured
  if (process.env.NODE_ENV === "production" && !BASIC_AUTH_PASS) {
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Command Center"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
