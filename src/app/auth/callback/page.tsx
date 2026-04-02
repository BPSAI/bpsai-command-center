"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");

    if (errorParam) {
      setError(`OAuth error: ${errorParam}`);
      return;
    }

    if (!code || !state) {
      setError("Missing authorization code or state");
      return;
    }

    // Exchange code for tokens via our API route (POST to avoid code in query string)
    fetch("/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then((res) => {
        if (!res.ok) return res.text().then((t) => Promise.reject(new Error(t)));
        return res.json();
      })
      .then(() => {
        window.location.href = "/";
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Authentication failed");
      });
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <h1 className="text-error font-bold text-sm tracking-widest uppercase">
            Authentication Failed
          </h1>
          <p className="text-foreground/50 text-xs text-center">{error}</p>
          <a
            href="/login"
            className="px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded text-xs uppercase tracking-wider"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-foreground/50 text-xs tracking-wider uppercase">
        Authenticating...
      </p>
    </div>
  );
}
