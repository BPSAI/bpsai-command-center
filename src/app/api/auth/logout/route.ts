import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleLogout } from "@/lib/auth-handlers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/oauth";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  await handleLogout(refreshToken);

  // Clear all auth cookies
  cookieStore.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  cookieStore.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  cookieStore.set("operator", "", { maxAge: 0, path: "/" });
  cookieStore.set("cc_has_license", "", { maxAge: 0, path: "/" });

  return NextResponse.json({ redirectTo: "/login" });
}
