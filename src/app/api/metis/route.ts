import { NextRequest, NextResponse } from "next/server";

const A2A_BASE_URL = process.env.A2A_BASE_URL ?? "https://a2a.paircoder.ai";

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
      headers: { "x-operator": operator },
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
