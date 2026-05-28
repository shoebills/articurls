"use client";

import { useMemo } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface SanitizedHtmlProps {
  html: string | null | undefined;
  className?: string;
  skipSanitize?: boolean;
}

export function SanitizedHtml({ html, className, skipSanitize = false }: SanitizedHtmlProps) {
  const sanitized = useMemo(() => {
    // If HTML is already sanitized server-side, don't re-process
    if (skipSanitize || !html) return html || "";
    return sanitizeHtml(html);
  }, [html, skipSanitize]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
