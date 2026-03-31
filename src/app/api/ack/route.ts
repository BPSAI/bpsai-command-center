import { NextRequest, NextResponse } from "next/server";

const A2A_BASE_URL = process.env.A2A_BASE_URL ?? "https://a2a.paircoder.ai";

export async function POST(request: NextRequest) {
  let body: { message_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.message_id || typeof body.message_id !== "string") {
    return NextResponse.json({ error: "message_id required" }, { status: 400 });
  }

  try {
    const operator = request.headers.get("x-operator") ?? "";
    const res = await fetch(`${A2A_BASE_URL}/messages/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-operator": operator },
      body: JSON.stringify({ message_id: body.message_id }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
