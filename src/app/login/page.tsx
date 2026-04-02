"use client";

import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login");
      if (!res.ok) throw new Error("Failed to start login");
      const { authUrl } = await res.json();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <h1 className="text-accent font-bold text-sm tracking-widest uppercase">
          BPSAI Command Center
        </h1>
        <p className="text-foreground/50 text-xs text-center">
          Authenticate with your organization account to access the command
          center.
        </p>

        {error && (
          <div className="text-error text-xs border border-error/30 bg-error/5 px-3 py-2 rounded w-full text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full px-4 py-3 bg-accent/15 text-accent border border-accent/30 rounded text-xs uppercase tracking-wider font-semibold hover:bg-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Redirecting..." : "Login with Zoho"}
        </button>

        <span className="text-foreground/30 text-[10px]">
          Secured by OAuth 2.0 PKCE
        </span>
      </div>
    </div>
  );
}
