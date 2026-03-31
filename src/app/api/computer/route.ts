export const dynamic = "force-dynamic";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 32 * 1024; // 32KB
const VALID_ROLES = new Set(["user", "assistant"]);

const SYSTEM_PROMPT = `You are Computer, the central AI consciousness of the BPSAI Command Center. You coordinate a fleet of autonomous coding agents (Navigator, Driver, Reviewer, QC). You speak in a calm, precise, slightly formal tone — like a ship's computer. You are aware of the agent fleet, ongoing sprints, and project status. Keep responses concise and actionable. Use technical language appropriate for a software engineering command center.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages: unknown[] =
    (body as Record<string, unknown>)?.messages as unknown[] ?? [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "No messages provided" }, { status: 400 });
  }

  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: `Too many messages (max ${MAX_MESSAGES})` },
      { status: 400 },
    );
  }

  // Validate each message
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) {
      return Response.json({ error: "Invalid message format" }, { status: 400 });
    }
    const m = msg as Record<string, unknown>;
    if (!VALID_ROLES.has(m.role as string)) {
      return Response.json(
        { error: `Invalid role: ${String(m.role)}. Must be "user" or "assistant"` },
        { status: 400 },
      );
    }
    if (typeof m.content !== "string") {
      return Response.json({ error: "Message content must be a string" }, { status: 400 });
    }
    if (m.content.length > MAX_CONTENT_LENGTH) {
      return Response.json(
        { error: `Message content too large (max ${MAX_CONTENT_LENGTH} bytes)` },
        { status: 400 },
      );
    }
  }

  const model = process.env.COMPUTER_MODEL ?? "claude-sonnet-4-20250514";

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    return Response.json(
      { error: `Upstream error: ${res.status}` },
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
