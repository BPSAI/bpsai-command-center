import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Tests for Computer system prompt with fleet awareness (CCD.3).
 *
 * Acceptance Criteria:
 * - System prompt explains dispatch: "I send work to your Computer Prime instance, which orchestrates execution locally"
 * - System prompt includes workspace context (from env var or configuration)
 * - Computer guides users: "Tell me what you need done — I'll dispatch it to your Computer instance"
 * - Computer confirms dispatch intent before calling tool: "I'll send this to your Computer instance: '...'. Send it?"
 * - Tests: system prompt contains dispatch guidance, confirmation flow works
 */

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// buildSystemPrompt — dispatch explanation
// ---------------------------------------------------------------------------

describe("buildSystemPrompt — dispatch explanation", () => {
  it("explains that Computer sends work to Computer Prime", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toContain(
      "I send work to your Computer Prime instance, which orchestrates execution locally",
    );
  });

  it("mentions the daemon decides agent selection and orchestration", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toMatch(/daemon|Computer Prime/i);
    expect(prompt).toMatch(/agent selection|orchestrat/i);
  });
});

// ---------------------------------------------------------------------------
// buildSystemPrompt — workspace context
// ---------------------------------------------------------------------------

describe("buildSystemPrompt — workspace context", () => {
  it("includes workspace from DEFAULT_WORKSPACE env var", async () => {
    process.env.DEFAULT_WORKSPACE = "bpsai-core";
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("bpsai-core");
  });

  it("includes workspace from parameter override", async () => {
    process.env.DEFAULT_WORKSPACE = "env-workspace";
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt({ workspace: "override-ws" });

    expect(prompt).toContain("override-ws");
  });

  it("uses fallback when no workspace configured", async () => {
    delete process.env.DEFAULT_WORKSPACE;
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    // Should still be valid without crashing
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------------------
// buildSystemPrompt — user guidance
// ---------------------------------------------------------------------------

describe("buildSystemPrompt — user guidance", () => {
  it("guides users to describe what they need done", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toContain(
      "Tell me what you need done",
    );
  });

  it("mentions dispatching to Computer instance", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("dispatch it to your Computer instance");
  });
});

// ---------------------------------------------------------------------------
// buildSystemPrompt — confirmation flow
// ---------------------------------------------------------------------------

describe("buildSystemPrompt — confirmation flow", () => {
  it("instructs Computer to confirm intent before dispatching", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toMatch(/confirm.*before|before.*dispatch/i);
  });

  it("includes example confirmation pattern", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toContain(
      "I'll send this to your Computer instance:",
    );
    expect(prompt).toContain("Send it?");
  });
});

// ---------------------------------------------------------------------------
// buildSystemPrompt — core personality preserved
// ---------------------------------------------------------------------------

describe("buildSystemPrompt — core personality", () => {
  it("retains Computer identity and tone guidance", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("Computer");
    expect(prompt).toMatch(/calm.*precise|ship.*computer/i);
  });

  it("retains awareness of agent fleet", async () => {
    const { buildSystemPrompt } = await import("../src/lib/system-prompt");
    const prompt = buildSystemPrompt();

    expect(prompt).toMatch(/Navigator|Driver|Reviewer|QC/);
    expect(prompt).toMatch(/fleet|agents/i);
  });
});

// ---------------------------------------------------------------------------
// route integration — system prompt used in Anthropic request
// ---------------------------------------------------------------------------

describe("/api/computer route — system prompt integration", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.DEFAULT_WORKSPACE = "test-workspace";
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends fleet-aware system prompt to Anthropic", async () => {
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
    const req = new Request("http://localhost/api/computer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-operator": "alice",
        cookie: "cc_access_token=jwt-123",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    await POST(req);

    const anthropicBody = JSON.parse(fetchSpy.mock.calls[0][1].body);

    // System prompt should contain fleet awareness
    expect(anthropicBody.system).toContain("Computer Prime");
    expect(anthropicBody.system).toContain("orchestrates execution locally");

    // System prompt should contain workspace context
    expect(anthropicBody.system).toContain("test-workspace");

    // System prompt should contain confirmation guidance
    expect(anthropicBody.system).toContain("Send it?");
  });
});
