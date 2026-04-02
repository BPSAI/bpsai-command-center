import { NextRequest, NextResponse } from "next/server";

/**
 * Build auth headers for A2A proxy calls using the portal session JWT.
 *
 * The portal JWT (from cc_access_token cookie) carries org_id and operator
 * claims that A2A uses for scoping. In dev mode without OAuth, the JWT may
 * be absent — we log a warning and proceed with x-operator only.
 */
export function getA2AAuthHeaders(
  operator: string,
  portalJwt: string | undefined,
): Record<string, string> {
  const headers: Record<string, string> = { "x-operator": operator };

  if (portalJwt) {
    headers["Authorization"] = `Bearer ${portalJwt}`;
  } else {
    console.warn(
      "[a2a-auth] No portal JWT — A2A call will lack Bearer token (dev mode?)",
    );
  }

  return headers;
}

/**
 * Extract portal JWT from request cookies and build A2A auth headers.
 * Returns a 401 Response if cookie is missing in production.
 */
export function getProxyAuth(
  request: NextRequest,
): { headers: Record<string, string> } | { error: NextResponse } {
  const operator = request.headers.get("x-operator") ?? "";
  const portalJwt = request.cookies.get("cc_access_token")?.value;

  if (!portalJwt && process.env.NODE_ENV === "production") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { headers: getA2AAuthHeaders(operator, portalJwt) };
}
