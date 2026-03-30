const A2A_BASE = "https://a2a.paircoder.ai";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        try {
          const res = await fetch(`${A2A_BASE}/messages/feed`, {
            cache: "no-store",
          });
          if (res.ok) {
            const messages = await res.json();
            send({ type: "messages", messages });
          } else {
            send({ type: "error", error: `Upstream ${res.status}` });
          }
        } catch {
          send({ type: "error", error: "Backend unreachable" });
        }
      };

      // Initial poll
      await poll();

      // Poll every 3 seconds
      const interval = setInterval(poll, 3000);

      // Clean up when client disconnects
      const cleanup = () => clearInterval(interval);
      controller.enqueue(encoder.encode(":ok\n\n"));

      // Store cleanup for when stream is cancelled
      (stream as unknown as { _cleanup: () => void })._cleanup = cleanup;
    },
    cancel() {
      const cleanup = (stream as unknown as { _cleanup?: () => void })
        ._cleanup;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
