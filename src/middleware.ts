import { NextRequest, NextResponse } from "next/server";

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? "captain";
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS ?? "";

function isAuthenticated(request: NextRequest): boolean {
  if (!BASIC_AUTH_PASS) return true; // no password = auth disabled

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;

  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(":");
  return user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS;
}

export function middleware(request: NextRequest) {
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
