import { NextRequest } from "next/server";
import { A2A_BASE_URL } from "@/lib/config";
import { getProxyAuth } from "@/lib/a2a-auth";

export const dynamic = "force-dynamic";

const MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 3000;
const KEEPALIVE_INTERVAL_MS = 30_000;

export async function GET(request: NextRequest) {
  const auth = getProxyAuth(request);
  if ("error" in auth) return auth.error;

  const encoder = new TextEncoder();
  let pollId: ReturnType<typeof setInterval> | null = null;
  let keepaliveId: ReturnType<typeof setInterval> | null = null;
  let maxDurationId: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const cleanup = () => {
        if (pollId !== null) { clearInterval(pollId); pollId = null; }
        if (keepaliveId !== null) { clearInterval(keepaliveId); keepaliveId = null; }
        if (maxDurationId !== null) { clearTimeout(maxDurationId); maxDurationId = null; }
      };

      const poll = async () => {
        try {
          const res = await fetch(`${A2A_BASE_URL}/messages/feed`, {
            cache: "no-store",
            headers: auth.headers,
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

      // Send :ok comment before first poll
      controller.enqueue(encoder.encode(":ok\n\n"));

      // Initial poll
      await poll();

      // Poll every 3 seconds
      pollId = setInterval(poll, POLL_INTERVAL_MS);

      // Keepalive comment every 30 seconds
      keepaliveId = setInterval(() => {
        controller.enqueue(encoder.encode(":keepalive\n\n"));
      }, KEEPALIVE_INTERVAL_MS);

      // Max connection duration: close after 5 minutes
      maxDurationId = setTimeout(() => {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      }, MAX_DURATION_MS);
    },
    cancel() {
      if (pollId !== null) { clearInterval(pollId); pollId = null; }
      if (keepaliveId !== null) { clearInterval(keepaliveId); keepaliveId = null; }
      if (maxDurationId !== null) { clearTimeout(maxDurationId); maxDurationId = null; }
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
