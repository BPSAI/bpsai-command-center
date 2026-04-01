import { NextRequest, NextResponse } from "next/server";
import { A2A_BASE_URL } from "@/lib/config";
import { getA2AAuthHeaders } from "@/lib/a2a-auth";

export async function GET(request: NextRequest) {
  const rawLimit = request.nextUrl.searchParams.get("limit") ?? "20";
  const parsed = parseInt(rawLimit, 10);
  const limit = Number.isNaN(parsed) ? 20 : Math.max(1, Math.min(100, parsed));

  const url = new URL(`${A2A_BASE_URL}/messages/feed`);
  url.searchParams.set("agent", "bpsai-metis");
  url.searchParams.set("limit", String(limit));

  const operator = request.headers.get("x-operator") ?? "";
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: await getA2AAuthHeaders(operator),
    });
    if (!res.ok) {
      return NextResponse.json(
        { messages: [], error: `Upstream ${res.status}` },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { messages: [], error: "Backend unreachable" },
      { status: 502 },
    );
  }
}
