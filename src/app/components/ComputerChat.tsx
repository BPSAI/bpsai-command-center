"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  generateSessionId,
  type ChatMessage,
  type SessionMeta,
} from "@/lib/chat-storage";
import { getOperatorFromCookie } from "@/lib/use-operator";
import SessionSidebar from "./SessionSidebar";

export default function ComputerChat() {
  const [operator, setOperator] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize operator and session on mount
  useEffect(() => {
    const op = getOperatorFromCookie();
    setOperator(op);
    if (!op) return;

    const existingSessions = listSessions(op);
    setSessions(existingSessions);

    if (existingSessions.length > 0) {
      // Restore most recent session
      const latest = existingSessions[0];
      setSessionId(latest.id);
      setMessages(loadSession(op, latest.id));
    } else {
      setSessionId(generateSessionId());
    }
  }, []);

  // Save to localStorage whenever messages change (skip empty)
  useEffect(() => {
    if (!operator || !sessionId || messages.length === 0) return;
    saveSession(operator, sessionId, messages);
    setSessions(listSessions(operator));
  }, [operator, sessionId, messages]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleNewChat = useCallback(() => {
    setSessionId(generateSessionId());
    setMessages([]);
    setInput("");
  }, []);

  const handleClear = useCallback(() => {
    if (!operator || !sessionId) return;
    deleteSession(operator, sessionId);
    setSessions(listSessions(operator));
    setSessionId(generateSessionId());
    setMessages([]);
    setInput("");
  }, [operator, sessionId]);

  const handleSelectSession = useCallback(
    (id: string) => {
      if (!operator) return;
      setSessionId(id);
      setMessages(loadSession(operator, id));
      setInput("");
    },
    [operator],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    // Add empty assistant message to fill via streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/computer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${err.error ?? res.statusText}`,
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (
              parsed.type === "content_block_delta" &&
              parsed.delta?.type === "text_delta"
            ) {
              const text = parsed.delta.text;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + text,
                };
                return updated;
              });
            }
          } catch {
            // skip unparseable events
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <div className="panel-header">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="text-accent text-[10px] hover:text-accent-dim mr-2"
          title="Toggle sessions"
        >
          {sidebarOpen ? "\u25C0" : "\u2630"}
        </button>
        <span className="status-dot" />
        Computer Chat
        {operator && (
          <span className="ml-2 text-foreground/40 text-[10px] font-normal normal-case tracking-normal">
            [{operator}]
          </span>
        )}
        {streaming && (
          <span className="ml-auto text-accent text-[10px] font-normal normal-case tracking-normal animate-pulse">
            STREAMING
          </span>
        )}
      </div>
      <div className="panel-body flex" style={{ padding: 0 }}>
        {sidebarOpen && (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={sessionId}
            onSelect={handleSelectSession}
            onNewChat={handleNewChat}
            onClear={handleClear}
          />
        )}
        <div className="flex flex-col flex-1 min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 && (
              <div className="text-foreground/30 text-xs text-center py-4">
                Session ready. Type a message to engage Computer.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="text-xs">
                <span className="text-accent font-semibold">
                  [{msg.role === "user" ? "you" : "computer"}]
                </span>{" "}
                {msg.role === "assistant" ? (
                  <span className="text-amber-400/90 prose-invert inline">
                    <ReactMarkdown
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        p: ({ children }) => <span>{children} </span>,
                        code: ({ children }) => (
                          <code className="bg-panel-border/30 px-1 rounded text-[11px]">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-panel-border/20 p-2 rounded my-1 overflow-x-auto text-[11px]">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {msg.content || "\u258A"}
                    </ReactMarkdown>
                  </span>
                ) : (
                  <span className="text-foreground/70">{msg.content}</span>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSubmit}
            className="border-t border-panel-border px-3 py-2 flex items-center gap-2"
          >
            <span className="text-accent text-xs">&rsaquo;</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              placeholder="Type a command..."
              className="flex-1 bg-transparent text-xs text-foreground/80 outline-none placeholder:text-foreground/30"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="text-accent text-xs hover:text-accent-dim disabled:opacity-30"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
