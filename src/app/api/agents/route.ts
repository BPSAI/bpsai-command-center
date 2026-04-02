import { NextRequest } from "next/server";
import { A2A_BASE_URL } from "@/lib/config";
import { getProxyAuth } from "@/lib/a2a-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = getProxyAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const res = await fetch(`${A2A_BASE_URL}/agents/status`, {
      cache: "no-store",
      headers: auth.headers,
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
