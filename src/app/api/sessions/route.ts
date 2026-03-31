import { NextRequest } from "next/server";
import { A2A_BASE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Build upstream URL with optional query filters */
function buildSessionsUrl(
  base: string,
  params: { operator?: string; status?: string; machine?: string },
): string {
  const url = new URL("/sessions", base);
  if (params.operator) url.searchParams.set("operator", params.operator);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.machine) url.searchParams.set("machine", params.machine);
  return url.toString();
}

export async function GET(request: NextRequest) {
  const operator = request.headers.get("x-operator") ?? "";
  const { searchParams } = request.nextUrl;

  const upstreamUrl = buildSessionsUrl(A2A_BASE_URL, {
    operator,
    status: searchParams.get("status") ?? undefined,
    machine: searchParams.get("machine") ?? undefined,
  });

  try {
    const res = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: { "x-operator": operator },
    });

    if (!res.ok) {
      return Response.json(
        { error: `Upstream responded ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
