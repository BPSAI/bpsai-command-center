/**
 * Dispatch tool definition and handler for Computer Chat.
 *
 * Sends dispatch messages to the operator's Computer Prime instance via A2A.
 * The daemon on the target machine decides orchestration details.
 */

import { A2A_BASE_URL } from "@/lib/config";

const getDefaultWorkspace = () =>
  process.env.DEFAULT_WORKSPACE ?? "default";

// ---------------------------------------------------------------------------
// Tool definition (Anthropic tool_use format)
// ---------------------------------------------------------------------------

export const DISPATCH_TOOL = {
  name: "dispatch",
  description:
    "Dispatch work to the operator's Computer Prime instance. " +
    "The daemon on the target machine decides agent selection, repo targeting, and enforcement mode.",
  input_schema: {
    type: "object" as const,
    properties: {
      intent: {
        type: "string",
        description:
          "Natural language description of the work to dispatch.",
      },
      workspace: {
        type: "string",
        description:
          "Target workspace for the dispatch. Defaults to the configured workspace.",
      },
    },
    required: ["intent"],
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export interface DispatchInput {
  intent: string;
  workspace?: string;
  operator: string;
  portalJwt?: string;
}

export interface DispatchResult {
  success: boolean;
  message: string;
}

export async function handleDispatch(
  input: DispatchInput,
): Promise<DispatchResult> {
  const workspace = input.workspace ?? getDefaultWorkspace();
  const url = `${A2A_BASE_URL}/messages`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-operator": input.operator,
  };
  if (input.portalJwt) {
    headers["Authorization"] = `Bearer ${input.portalJwt}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "dispatch",
        from_project: "command-center",
        to_project: "computer",
        content: input.intent,
        severity: "info",
        operator: input.operator,
        workspace,
        metadata: { source: "cc-dispatch" },
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        message: `A2A dispatch failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      message: "Dispatch sent to your Computer instance.",
    };
  } catch {
    return {
      success: false,
      message: "A2A service unreachable — dispatch could not be delivered.",
    };
  }
}
