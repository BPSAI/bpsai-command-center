import { PAIRCODER_API_URL, LICENSE_ID } from "./config";

interface TokenResponse {
  token: string;
  expires_at: string;
  tier: string;
  operator: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function fetchToken(operator: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${PAIRCODER_API_URL}/api/v1/auth/operator-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_id: LICENSE_ID, operator }),
      },
    );

    if (!res.ok) return null;

    const data: TokenResponse = await res.json();
    cachedToken = {
      token: data.token,
      expiresAt: new Date(data.expires_at).getTime(),
    };
    return data.token;
  } catch {
    return null;
  }
}

export async function getA2AAuthHeaders(
  operator: string,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "x-operator": operator };

  if (!LICENSE_ID) return headers;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    headers["Authorization"] = `Bearer ${cachedToken.token}`;
    return headers;
  }

  const token = await fetchToken(operator);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}
