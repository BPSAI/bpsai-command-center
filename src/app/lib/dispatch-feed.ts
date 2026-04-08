import type { FeedMessage } from "./feed";

const DISPATCH_TYPES = new Set(["dispatch", "dispatch-result", "dispatch-ack"]);

/** Check if a message type is dispatch-related */
export function isDispatchType(type: string): boolean {
  return DISPATCH_TYPES.has(type);
}

/** Parse dispatch content — structured JSON with agent, target, prompt */
export function parseDispatch(
  content: string,
): { agent: string; target: string; prompt: string } | null {
  try {
    const parsed = JSON.parse(content);
    if ("agent" in parsed && "target" in parsed && "prompt" in parsed) {
      return parsed;
    }
  } catch {
    /* plain text */
  }
  return null;
}

/** Parse dispatch-result content with agent, repo, outcome */
export function parseDispatchResult(content: string): {
  success: boolean;
  output: string;
  dispatchId: string;
  agent: string;
  repo: string;
} | null {
  try {
    const parsed = JSON.parse(content);
    if ("success" in parsed) {
      return {
        success: parsed.success,
        output: parsed.output ?? "",
        dispatchId: parsed.dispatch_id ?? "",
        agent: parsed.agent ?? "",
        repo: parsed.repo ?? "",
      };
    }
  } catch {
    /* not JSON */
  }
  return null;
}

/** Parse dispatch-ack content — in-progress acknowledgment */
export function parseDispatchAck(content: string): {
  agent: string;
  repo: string;
  dispatchId: string;
} | null {
  try {
    const parsed = JSON.parse(content);
    return {
      agent: parsed.agent ?? "",
      repo: parsed.repo ?? "",
      dispatchId: parsed.dispatch_id ?? "",
    };
  } catch {
    /* not JSON */
  }
  return null;
}

export interface RenderedContent {
  summary: string;
  detail: string | null;
  color: string;
  refId: string | null;
}

/**
 * Render dispatch-related message content.
 * Returns null if the message type is not dispatch-related.
 */
export function renderDispatchContent(msg: FeedMessage): RenderedContent | null {
  if (!isDispatchType(msg.type)) return null;

  if (msg.type === "dispatch") {
    const parsed = parseDispatch(msg.content);
    if (parsed) {
      return {
        summary: `Dispatch ${parsed.agent} → ${parsed.target}: ${parsed.prompt}`,
        detail: `Agent: ${parsed.agent}\nTarget: ${parsed.target}\nPrompt: ${parsed.prompt}`,
        color: "text-accent",
        refId: null,
      };
    }
    return { summary: msg.content, detail: null, color: "text-accent", refId: null };
  }

  if (msg.type === "dispatch-result") {
    const parsed = parseDispatchResult(msg.content);
    if (parsed) {
      const outcome = parsed.success ? "complete" : "failed";
      const parts = [parsed.agent, parsed.repo].filter(Boolean);
      const prefix = parts.length > 0 ? `${parts.join(" @ ")} — ` : "";
      return {
        summary: `${prefix}Dispatch ${outcome}`,
        detail: parsed.output || null,
        color: parsed.success ? "text-success" : "text-danger",
        refId: parsed.dispatchId || null,
      };
    }
    return { summary: msg.content, detail: null, color: "text-foreground/60", refId: null };
  }

  if (msg.type === "dispatch-ack") {
    const parsed = parseDispatchAck(msg.content);
    if (parsed) {
      const parts = [parsed.agent, parsed.repo].filter(Boolean);
      const prefix = parts.length > 0 ? `${parts.join(" @ ")} — ` : "";
      return {
        summary: `${prefix}Running`,
        detail: null,
        color: "text-warning",
        refId: parsed.dispatchId || null,
      };
    }
    return { summary: msg.content, detail: null, color: "text-warning", refId: null };
  }

  return null;
}
