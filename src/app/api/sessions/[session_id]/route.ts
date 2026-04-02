import { NextRequest } from "next/server";
import { A2A_BASE_URL } from "@/lib/config";
import { getProxyAuth } from "@/lib/a2a-auth";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["started", "running", "complete", "failed"]);

interface RouteContext {
  params: Promise<{ session_id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { session_id } = await context.params;
  const auth = getProxyAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const res = await fetch(`${A2A_BASE_URL}/sessions/${encodeURIComponent(session_id)}`, {
      cache: "no-store",
      headers: auth.headers,
    });

    if (!res.ok) {
      return Response.json(
        { error: `Upstream responded ${res.status}` },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

const PATCH_ALLOWED_FIELDS = new Set(["status"]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { session_id } = await context.params;
  const auth = getProxyAuth(request);
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "Body must be a JSON object" },
      { status: 400 },
    );
  }

  if (
    body.status !== undefined &&
    (typeof body.status !== "string" || !VALID_STATUSES.has(body.status))
  ) {
    return Response.json({ error: "Invalid status value" }, { status: 400 });
  }

  // Only forward allowed fields to upstream
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (PATCH_ALLOWED_FIELDS.has(key)) {
      filtered[key] = body[key];
    }
  }

  try {
    const res = await fetch(`${A2A_BASE_URL}/sessions/${encodeURIComponent(session_id)}`, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...auth.headers,
      },
      body: JSON.stringify(filtered),
    });

    if (!res.ok) {
      return Response.json(
        { error: `Upstream responded ${res.status}` },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
