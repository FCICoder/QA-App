"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "نسخ الرابط",
  doneLabel = "اتنسخ",
  className = "btn-secondary",
}: {
  text: string;
  label?: string;
  doneLabel?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard blocked (e.g. no HTTPS): fall back to a prompt the user can copy from.
          window.prompt("انسخ من هنا:", text);
        }
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      }}
    >
      <span aria-live="polite">{done ? `${doneLabel} ✓` : label}</span>
    </button>
  );
}
