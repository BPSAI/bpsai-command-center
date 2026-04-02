import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  refreshPortalSession,
  parseJwtClaims,
} from "@/lib/oauth";
import { hasLicenseInJwt } from "@/lib/license";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return Response.json({ error: "No refresh token" }, { status: 401 });
  }

  try {
    const session = await refreshPortalSession(refreshToken);
    const isProduction = process.env.NODE_ENV === "production";

    // Set new access token
    cookieStore.set(ACCESS_TOKEN_COOKIE, session.access_token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    // Set new refresh token
    cookieStore.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    // Update operator cookie
    const claims = parseJwtClaims(session.access_token);
    const operator =
      claims?.display_name || claims?.email || claims?.sub || "";
    cookieStore.set("operator", operator, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: isProduction,
    });

    // Set license status cookie
    const licensed = hasLicenseInJwt(session.access_token);
    cookieStore.set("cc_has_license", licensed ? "1" : "0", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: isProduction,
    });

    return Response.json({ refreshed: true, hasLicense: licensed });
  } catch {
    return Response.json({ error: "Session refresh failed" }, { status: 502 });
  }
}
