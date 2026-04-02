import { NextRequest } from "next/server";
import { A2A_BASE_URL } from "@/lib/config";
import { getProxyAuth } from "@/lib/a2a-auth";

export const dynamic = "force-dynamic";

const RESUMABLE_STATUSES = new Set(["complete", "failed"]);

interface RouteContext {
  params: Promise<{ session_id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { session_id } = await context.params;
  const operator = request.headers.get("x-operator") ?? "";

  if (!operator) {
    return Response.json({ error: "Operator required" }, { status: 401 });
  }

  const auth = getProxyAuth(request);
  if ("error" in auth) return auth.error;

  // Fetch session to validate ownership and resumability
  let session: { operator: string; status: string };
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

    session = await res.json();
  } catch {
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }

  // Operator scoping: can only resume own sessions
  if (session.operator !== operator) {
    return Response.json(
      { error: "Cannot resume another operator's session" },
      { status: 403 },
    );
  }

  // Check session is resumable
  if (!RESUMABLE_STATUSES.has(session.status)) {
    return Response.json(
      { error: "Session not resumable" },
      { status: 409 },
    );
  }

  // Dispatch resume command to A2A
  try {
    const res = await fetch(`${A2A_BASE_URL}/dispatch`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...auth.headers,
      },
      body: JSON.stringify({
        type: "resume",
        session_id,
        operator,
      }),
    });

    if (!res.ok) {
      return Response.json(
        { error: `Dispatch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
