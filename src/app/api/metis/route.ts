import { NextRequest, NextResponse } from "next/server";

const A2A_BASE = "https://a2a.paircoder.ai";

export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get("limit") ?? "20";

  try {
    const res = await fetch(
      `${A2A_BASE}/messages/feed?agent=bpsai-metis&limit=${limit}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json(
        { messages: [], error: `Upstream ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { messages: [], error: "Backend unreachable" },
      { status: 502 }
    );
  }
}
