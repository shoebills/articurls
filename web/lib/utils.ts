import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractTextFromHtml(html: string): string {
  if (typeof document === "undefined") return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function getContentExcerpt(html: string, maxLen = 160): string {
  const text = extractTextFromHtml(html).replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 0) {
    return cut.slice(0, lastSpace).trimEnd() + "...";
  }
  return cut.trimEnd() + "...";
}
