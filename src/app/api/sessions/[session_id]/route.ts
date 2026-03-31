import { NextRequest } from "next/server";

const A2A_BASE_URL = process.env.A2A_BASE_URL ?? "https://a2a.paircoder.ai";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["started", "running", "complete", "failed"]);

interface RouteContext {
  params: Promise<{ session_id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { session_id } = await context.params;
  const operator = request.headers.get("x-operator") ?? "";

  try {
    const res = await fetch(`${A2A_BASE_URL}/sessions/${session_id}`, {
      cache: "no-store",
      headers: { "x-operator": operator },
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { session_id } = await context.params;
  const operator = request.headers.get("x-operator") ?? "";

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

  try {
    const res = await fetch(`${A2A_BASE_URL}/sessions/${session_id}`, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-operator": operator,
      },
      body: JSON.stringify(body),
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
