"use client";

import { useState } from "react";

interface LicenseLinkModalProps {
  hasLicense: boolean;
  onLinked: () => void;
}

export default function LicenseLinkModal({
  hasLicense,
  onLinked,
}: LicenseLinkModalProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (hasLicense || dismissed) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const linkRes = await fetch("/api/license/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey }),
      });

      if (!linkRes.ok) {
        const body = await linkRes.json();
        setError(body.error || "Failed to link license");
        setLoading(false);
        return;
      }

      // Refresh session to get updated JWT with license_id
      await fetch("/api/auth/refresh-session", { method: "POST" });

      onLinked();
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="border border-panel-border bg-panel-bg rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
        <h2 className="text-accent font-bold text-sm uppercase tracking-widest mb-4">
          Link Your PairCoder License
        </h2>

        <p className="text-foreground/70 text-xs mb-4">
          Enter your PairCoder license key to enable A2A sessions and advanced
          features. You can skip this and use chat-only mode.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="License key (e.g. PCKEY-...)"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-panel-border rounded text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:border-accent mb-3"
            disabled={loading}
            autoFocus
          />

          {error && (
            <p className="text-danger text-xs mb-3">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="px-4 py-1.5 text-xs uppercase tracking-wider text-foreground/40 hover:text-foreground/60 transition-colors"
              disabled={loading}
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={!licenseKey.trim() || loading}
              className="px-4 py-1.5 text-xs uppercase tracking-wider font-semibold bg-accent/15 text-accent border border-accent/30 rounded hover:bg-accent/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Linking…" : "Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
