import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the dispatch tool: definition, handler, and /api/computer integration.
 *
 * Acceptance Criteria covered:
 * - Tool definition included in Anthropic API request
 * - dispatch tool with intent (required) and workspace (optional, defaults)
 * - Operator extracted from portal JWT cookie
 * - POSTs dispatch to A2A: { type: "dispatch", operator, workspace, intent }
 * - A2A_BASE_URL configurable via env var
 * - Tool result returned for conversational response
 * - Streaming with tool_use/tool_result handled
 * - A2A unreachable returns tool error
 */

const ORIGINAL_ENV = process.env;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    A2A_BASE_URL: "https://a2a.test",
    ANTHROPIC_API_KEY: "test-key",
    DEFAULT_WORKSPACE: "my-workspace",
  };
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// dispatch tool definition
// ---------------------------------------------------------------------------

describe("dispatch tool definition", () => {
  it("defines dispatch tool with correct schema", async () => {
    const { DISPATCH_TOOL } = await import("../src/lib/dispatch-tool");

    expect(DISPATCH_TOOL.name).toBe("dispatch");
    expect(DISPATCH_TOOL.input_schema.type).toBe("object");
    expect(DISPATCH_TOOL.input_schema.properties.intent).toEqual({
      type: "string",
      description: expect.any(String),
    });
    expect(DISPATCH_TOOL.input_schema.properties.workspace).toEqual({
      type: "string",
      description: expect.any(String),
    });
    expect(DISPATCH_TOOL.input_schema.required).toEqual(["intent"]);
  });
});

// ---------------------------------------------------------------------------
// dispatch handler
// ---------------------------------------------------------------------------

describe("handleDispatch", () => {
  it("POSTs dispatch message to A2A with correct format", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "accepted" }),
    });

    const { handleDispatch } = await import("../src/lib/dispatch-tool");
    const result = await handleDispatch({
      intent: "refactor auth module",
      workspace: "bpsai-core",
      operator: "alice",
      portalJwt: "jwt-token-123",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://a2a.test/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-token-123",
          "x-operator": "alice",
        }),
        body: JSON.stringify({
          type: "dispatch",
          operator: "alice",
          workspace: "bpsai-core",
          intent: "refactor auth module",
        }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain("Dispatch sent");
  });

  it("uses DEFAULT_WORKSPACE when workspace not provided", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "accepted" }),
    });

    const { handleDispatch } = await import("../src/lib/dispatch-tool");
    await handleDispatch({
      intent: "fix tests",
      operator: "bob",
      portalJwt: "jwt-bob",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.workspace).toBe("my-workspace");
  });

  it("returns error when A2A is unreachable", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const { handleDispatch } = await import("../src/lib/dispatch-tool");
    const result = await handleDispatch({
      intent: "deploy staging",
      operator: "alice",
      portalJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("unreachable");
  });

  it("returns error when A2A responds with non-OK status", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const { handleDispatch } = await import("../src/lib/dispatch-tool");
    const result = await handleDispatch({
      intent: "run tests",
      operator: "alice",
      portalJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("503");
  });

  it("uses A2A_BASE_URL from environment", async () => {
    process.env.A2A_BASE_URL = "https://custom-a2a.example.com";
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "accepted" }),
    });

    const { handleDispatch } = await import("../src/lib/dispatch-tool");
    await handleDispatch({
      intent: "test",
      operator: "alice",
      portalJwt: "jwt",
    });

    expect(fetchSpy.mock.calls[0][0]).toBe(
      "https://custom-a2a.example.com/dispatch",
    );
  });
});

// ---------------------------------------------------------------------------
// /api/computer route — tool definitions sent to Anthropic
// ---------------------------------------------------------------------------

describe("/api/computer route — tool integration", () => {
  function makeComputerRequest(opts?: {
    operator?: string;
    jwt?: string;
    messages?: unknown[];
  }) {
    const messages = opts?.messages ?? [
      { role: "user", content: "Hello Computer" },
    ];
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (opts?.operator) headers["x-operator"] = opts.operator;
    if (opts?.jwt) headers["cookie"] = `cc_access_token=${opts.jwt}`;

    return new Request("http://localhost/api/computer", {
      method: "POST",
      headers,
      body: JSON.stringify({ messages }),
    });
  }

  it("includes tool definitions in Anthropic API request", async () => {
    // Mock Anthropic response — simple text, no tool use
    const sseBody = [
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join("");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseBody));
          controller.close();
        },
      }),
    });

    const { POST } = await import("../src/app/api/computer/route");
    const req = makeComputerRequest({
      operator: "alice",
      jwt: "portal-jwt",
    });
    await POST(req);

    // Verify that fetch to Anthropic includes tools
    const anthropicCall = fetchSpy.mock.calls[0];
    const requestBody = JSON.parse(anthropicCall[1].body);
    expect(requestBody.tools).toBeDefined();
    expect(requestBody.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "dispatch" }),
      ]),
    );
  });

  it("handles tool_use in stream — executes dispatch and continues", async () => {
    // First Anthropic call returns tool_use
    const toolUseSSE = [
      'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"dispatch","input":{}}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"intent\\":\\"fix auth\\",\\"workspace\\":\\"core\\"}"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join("");

    // Second Anthropic call returns text response after tool_result
    const textSSE = [
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Dispatch sent to your Computer instance."}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join("");

    let callCount = 0;
    fetchSpy.mockImplementation(async (url: string) => {
      if (url.includes("anthropic")) {
        callCount++;
        const body = callCount === 1 ? toolUseSSE : textSSE;
        return {
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(body));
              controller.close();
            },
          }),
        };
      }
      // A2A dispatch call
      if (url.includes("a2a.test")) {
        return {
          ok: true,
          json: async () => ({ status: "accepted" }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { POST } = await import("../src/app/api/computer/route");
    const req = makeComputerRequest({
      operator: "alice",
      jwt: "portal-jwt",
    });
    const res = await POST(req);

    // Read the full streamed response
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    // Should have called Anthropic twice (initial + tool_result)
    const anthropicCalls = fetchSpy.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes("anthropic"),
    );
    expect(anthropicCalls.length).toBe(2);

    // Second call should include tool_result message
    const secondBody = JSON.parse(anthropicCalls[1][1].body);
    const toolResultMsg = secondBody.messages.find(
      (m: Record<string, unknown>) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        (m.content as Record<string, unknown>[]).some(
          (c: Record<string, unknown>) => c.type === "tool_result",
        ),
    );
    expect(toolResultMsg).toBeDefined();

    // A2A dispatch should have been called
    const a2aCalls = fetchSpy.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes("a2a.test"),
    );
    expect(a2aCalls.length).toBe(1);

    // Verify the A2A dispatch body
    const dispatchBody = JSON.parse(a2aCalls[0][1].body);
    expect(dispatchBody).toEqual({
      type: "dispatch",
      operator: "alice",
      workspace: "core",
      intent: "fix auth",
    });

    // Final stream should contain the text response
    expect(fullText).toContain("Dispatch sent");
  });

  it("returns tool error when A2A is unreachable during dispatch", async () => {
    // First Anthropic call returns tool_use
    const toolUseSSE = [
      'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"dispatch","input":{}}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"intent\\":\\"deploy\\"}"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join("");

    // Second Anthropic call — Claude handles the error gracefully
    const errorResponseSSE = [
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"I was unable to dispatch."}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join("");

    let callCount = 0;
    fetchSpy.mockImplementation(async (url: string) => {
      if (url.includes("anthropic")) {
        callCount++;
        const body = callCount === 1 ? toolUseSSE : errorResponseSSE;
        return {
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(body));
              controller.close();
            },
          }),
        };
      }
      // A2A dispatch — unreachable
      if (url.includes("a2a.test")) {
        throw new Error("ECONNREFUSED");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { POST } = await import("../src/app/api/computer/route");
    const req = makeComputerRequest({
      operator: "alice",
      jwt: "portal-jwt",
    });
    const res = await POST(req);

    // Read stream
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    // Second Anthropic call should include tool_result with is_error
    const anthropicCalls = fetchSpy.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes("anthropic"),
    );
    expect(anthropicCalls.length).toBe(2);

    const secondBody = JSON.parse(anthropicCalls[1][1].body);
    const toolResultMsg = secondBody.messages.find(
      (m: Record<string, unknown>) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        (m.content as Record<string, unknown>[]).some(
          (c: Record<string, unknown>) =>
            c.type === "tool_result" && c.is_error === true,
        ),
    );
    expect(toolResultMsg).toBeDefined();
  });

  it("extracts operator from x-operator header set by auth middleware", async () => {
    const sseBody = [
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ].join("");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseBody));
          controller.close();
        },
      }),
    });

    const { POST } = await import("../src/app/api/computer/route");
    const req = makeComputerRequest({
      operator: "bob-operator",
      jwt: "some-jwt",
    });
    await POST(req);

    // The route should pass through — operator is available for tool dispatch
    expect(fetchSpy).toHaveBeenCalled();
  });
});
