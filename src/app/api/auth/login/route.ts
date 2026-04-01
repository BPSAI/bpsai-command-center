import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildLoginRedirect } from "@/lib/auth-handlers";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/auth/callback`;

  const { authUrl, codeVerifier, state } =
    await buildLoginRedirect(redirectUri);

  // Store PKCE verifier and state in short-lived httpOnly cookies
  // so the callback can retrieve them
  const cookieStore = await cookies();
  cookieStore.set("pkce_verifier", codeVerifier, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
  });
  cookieStore.set("oauth_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
  });

  return NextResponse.json({ authUrl });
}
