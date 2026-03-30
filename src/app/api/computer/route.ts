export const dynamic = "force-dynamic";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are Computer, the central AI consciousness of the BPSAI Command Center. You coordinate a fleet of autonomous coding agents (Navigator, Driver, Reviewer, QC). You speak in a calm, precise, slightly formal tone — like a ship's computer. You are aware of the agent fleet, ongoing sprints, and project status. Keep responses concise and actionable. Use technical language appropriate for a software engineering command center.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const messages: { role: string; content: string }[] = body.messages ?? [];

  if (messages.length === 0) {
    return Response.json({ error: "No messages provided" }, { status: 400 });
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `Anthropic API error: ${res.status}`, details: text },
      { status: 502 },
    );
  }

  // Forward the SSE stream from Anthropic
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
