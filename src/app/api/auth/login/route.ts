import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildLoginRedirect } from "@/lib/auth-handlers";

export async function GET(_request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 },
    );
  }
  const redirectUri = `${appUrl}/auth/callback`;

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
