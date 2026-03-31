export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionMeta {
  id: string;
  updatedAt: number;
  preview: string;
}

const MESSAGES_PREFIX = "chat:";
const INDEX_PREFIX = "chat-sessions:";

function messagesKey(operator: string, sessionId: string): string {
  return `${MESSAGES_PREFIX}${operator}:${sessionId}`;
}

function indexKey(operator: string): string {
  return `${INDEX_PREFIX}${operator}`;
}

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveSession(
  operator: string,
  sessionId: string,
  messages: ChatMessage[],
): boolean {
  try {
    localStorage.setItem(messagesKey(operator, sessionId), JSON.stringify(messages));

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const preview = lastUserMsg?.content.slice(0, 80) ?? "";

    const index = loadIndex(operator);
    const existing = index.findIndex((s) => s.id === sessionId);
    const meta: SessionMeta = { id: sessionId, updatedAt: Date.now(), preview };
    if (existing >= 0) {
      index[existing] = meta;
    } else {
      index.push(meta);
    }
    localStorage.setItem(indexKey(operator), JSON.stringify(index));
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return false;
    }
    return false;
  }
}

export function loadSession(operator: string, sessionId: string): ChatMessage[] {
  const raw = localStorage.getItem(messagesKey(operator, sessionId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export function deleteSession(operator: string, sessionId: string): void {
  localStorage.removeItem(messagesKey(operator, sessionId));
  const index = loadIndex(operator).filter((s) => s.id !== sessionId);
  localStorage.setItem(indexKey(operator), JSON.stringify(index));
}

export function listSessions(operator: string): SessionMeta[] {
  return loadIndex(operator).sort((a, b) => b.updatedAt - a.updatedAt);
}

function loadIndex(operator: string): SessionMeta[] {
  const raw = localStorage.getItem(indexKey(operator));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SessionMeta[];
  } catch {
    return [];
  }
}
