const A2A_BASE_URL = process.env.A2A_BASE_URL ?? "https://a2a.paircoder.ai";

export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        try {
          const res = await fetch(`${A2A_BASE_URL}/messages/feed`, {
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
      intervalId = setInterval(poll, 3000);

      controller.enqueue(encoder.encode(":ok\n\n"));
    },
    cancel() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
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
