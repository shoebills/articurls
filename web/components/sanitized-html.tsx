"use client";

import { useMemo } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface SanitizedHtmlProps {
  html: string | null | undefined;
  className?: string;
}

export function SanitizedHtml({ html, className }: SanitizedHtmlProps) {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
