export const dynamic = "force-dynamic";

import { DISPATCH_TOOL, handleDispatch } from "@/lib/dispatch-tool";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 32 * 1024; // 32KB
const VALID_ROLES = new Set(["user", "assistant"]);

const SYSTEM_PROMPT = `You are Computer, the central AI consciousness of the BPSAI Command Center. You coordinate a fleet of autonomous coding agents (Navigator, Driver, Reviewer, QC). You speak in a calm, precise, slightly formal tone — like a ship's computer. You are aware of the agent fleet, ongoing sprints, and project status. Keep responses concise and actionable. Use technical language appropriate for a software engineering command center.

When the user asks you to do work (build, fix, refactor, deploy, etc.), use the dispatch tool to send the work to their Computer Prime instance. Include a clear intent describing what needs to be done. After dispatching, confirm what was sent.`;

const TOOLS = [DISPATCH_TOOL];

interface SSEToolUse {
  id: string;
  name: string;
  partialJson: string;
}

/**
 * Parse SSE events from a streaming response body.
 * Returns the collected text chunks and any tool_use blocks.
 */
async function consumeSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk?: (chunk: Uint8Array) => void,
): Promise<{
  stopReason: string | null;
  toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  rawEvents: string;
}> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let stopReason: string | null = null;
  const pendingToolUses: Map<number, SSEToolUse> = new Map();
  let rawEvents = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    rawEvents += chunk;
    if (onChunk) onChunk(value);

    // Parse SSE lines for tool_use and stop_reason
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const event = JSON.parse(data);

        if (
          event.type === "content_block_start" &&
          event.content_block?.type === "tool_use"
        ) {
          pendingToolUses.set(event.index, {
            id: event.content_block.id,
            name: event.content_block.name,
            partialJson: "",
          });
        }

        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "input_json_delta"
        ) {
          const tool = pendingToolUses.get(event.index);
          if (tool) {
            tool.partialJson += event.delta.partial_json;
          }
        }

        if (event.type === "message_delta" && event.delta?.stop_reason) {
          stopReason = event.delta.stop_reason;
        }
      } catch {
        // Skip non-JSON lines
      }
    }
  }

  const toolUses = Array.from(pendingToolUses.values()).map((t) => ({
    id: t.id,
    name: t.name,
    input: t.partialJson ? JSON.parse(t.partialJson) : {},
  }));

  return { stopReason, toolUses, rawEvents };
}

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

  // Extract auth context for dispatch tool
  const operator = request.headers.get("x-operator") ?? "";
  const cookieHeader = request.headers.get("cookie") ?? "";
  const jwtMatch = cookieHeader.match(/cc_access_token=([^;]+)/);
  const portalJwt = jwtMatch?.[1];

  const model = process.env.COMPUTER_MODEL ?? "claude-sonnet-4-20250514";

  const anthropicBody = {
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
    tools: TOOLS,
    stream: true,
  };

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(anthropicBody),
  });

  if (!res.ok) {
    return Response.json(
      { error: `Upstream error: ${res.status}` },
      { status: 502 },
    );
  }

  // Create a TransformStream to handle the SSE proxy with tool execution
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Process stream in background
  (async () => {
    try {
      // Consume first stream, forwarding chunks to client
      const { stopReason, toolUses } = await consumeSSEStream(
        res.body!,
        (chunk) => writer.write(chunk),
      );

      // If Claude wants to use a tool, handle it
      if (stopReason === "tool_use" && toolUses.length > 0) {
        // Execute each tool and collect results
        const toolResults = await Promise.all(
          toolUses.map(async (toolUse) => {
            if (toolUse.name === "dispatch") {
              const input = toolUse.input as { intent: string; workspace?: string };
              const result = await handleDispatch({
                intent: input.intent,
                workspace: input.workspace,
                operator,
                portalJwt,
              });
              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: result.message,
                is_error: !result.success,
              };
            }
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: "Unknown tool",
              is_error: true,
            };
          }),
        );

        // Build continuation messages: assistant message with tool_use, then user with tool_result
        const assistantContent = toolUses.map((t) => ({
          type: "tool_use",
          id: t.id,
          name: t.name,
          input: t.input,
        }));

        const continuationMessages = [
          ...messages,
          { role: "assistant", content: assistantContent },
          { role: "user", content: toolResults },
        ];

        // Make second API call with tool results
        const continuationRes = await fetch(ANTHROPIC_API_URL, {
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
            messages: continuationMessages,
            tools: TOOLS,
            stream: true,
          }),
        });

        if (continuationRes.ok && continuationRes.body) {
          // Send a separator so the client knows tool execution happened
          await writer.write(
            encoder.encode(
              `event: tool_execution\ndata: ${JSON.stringify({ tool_uses: toolUses.map((t) => t.name) })}\n\n`,
            ),
          );

          // Stream the continuation response
          await consumeSSEStream(continuationRes.body, (chunk) =>
            writer.write(chunk),
          );
        }
      }
    } catch (err) {
      console.error("[computer] Stream processing error:", err);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
