const A2A_BASE = "https://a2a.paircoder.ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${A2A_BASE}/agents/standup`, {
      cache: "no-store",
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
