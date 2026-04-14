export type AdInjectedSegment =
  | { type: "html"; html: string }
  | { type: "ad"; key: string; slotType: "rectangle" | "horizontal" | "vertical" };

const PARAGRAPH_RE = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
const TAG_RE = /<[^>]+>/g;

function wordCount(html: string): number {
  const text = html.replace(TAG_RE, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(" ").length;
}

function maxAdsForContent(content: string): number {
  const words = wordCount(content);
  if (words < 800) return 2;
  if (words < 1500) return 3;
  if (words < 2500) return 4;
  return 5;
}

function isNearHeadingOrImage(chunk: string): boolean {
  return /<h[1-6]\b|<img\b|<figure\b/i.test(chunk);
}

export function injectAdsIntoHtml(content: string, frequency: number, maxAds = 4): AdInjectedSegment[] {
  const safeFrequency = Math.max(2, Math.floor(frequency || 3));
  const matches = Array.from(content.matchAll(PARAGRAPH_RE));
  if (matches.length < 2) return [{ type: "html", html: content }];

  const firstEligibleIdx = Math.ceil(matches.length * 0.2);
  const lastEligibleIdx = Math.floor(matches.length * 0.85) - 1;
  const computedMaxAds = Math.min(maxAds, maxAdsForContent(content));
  const slotSequence: Array<"rectangle" | "horizontal" | "vertical"> = [
    "rectangle",
    "horizontal",
    "rectangle",
  ];
  let cursor = 0;
  let inserted = 0;
  let lastInsertedIdx = -99;
  const segments: AdInjectedSegment[] = [];

  for (let idx = 0; idx < matches.length; idx += 1) {
    const match = matches[idx];
    const start = match.index ?? -1;
    if (start < 0) continue;
    const end = start + match[0].length;
    const paragraphNumber = idx + 1;
    const betweenChunksStart = idx > 0 ? (matches[idx - 1].index ?? 0) + matches[idx - 1][0].length : 0;
    const nearbyChunk = content.slice(betweenChunksStart, start);
    const shouldInsert =
      paragraphNumber % safeFrequency === 0 &&
      idx >= firstEligibleIdx &&
      idx <= lastEligibleIdx &&
      inserted < computedMaxAds &&
      idx - lastInsertedIdx >= 2 &&
      !isNearHeadingOrImage(nearbyChunk);

    if (!shouldInsert) continue;

    const htmlChunk = content.slice(cursor, end);
    if (htmlChunk) segments.push({ type: "html", html: htmlChunk });
    segments.push({
      type: "ad",
      key: `ad-${inserted}-${paragraphNumber}`,
      slotType: slotSequence[inserted % slotSequence.length],
    });
    inserted += 1;
    lastInsertedIdx = idx;
    cursor = end;
  }

  const rest = content.slice(cursor);
  if (rest) segments.push({ type: "html", html: rest });
  return segments.length > 0 ? segments : [{ type: "html", html: content }];
}
