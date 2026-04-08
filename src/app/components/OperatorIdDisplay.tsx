"use client";

import { useState } from "react";

interface OperatorIdDisplayProps {
  operatorId: string;
}

export default function OperatorIdDisplay({
  operatorId,
}: OperatorIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!operatorId) {
    return (
      <span className="text-foreground/40 text-[10px] sm:text-xs">
        Not assigned — contact admin
      </span>
    );
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(operatorId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs">
      <span className="text-foreground/50">ID:</span>
      <code className="text-accent-dim font-mono">{operatorId}</code>
      <button
        onClick={handleCopy}
        aria-label="Copy operator ID"
        className="text-foreground/30 hover:text-accent transition-colors uppercase tracking-wider"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </span>
  );
}
