function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchableText(html: string): string {
  return normalizeText(decodeHtmlEntities(html).replace(/<[^>]*>/g, " "));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let start = 0;
  while (true) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) break;
    count += 1;
    start = idx + needle.length;
  }
  return count;
}

export type PrecomputedSearchItem = {
  normalizedTitle: string;
  normalizedContent: string;
};

export function precomputeSearchItem(title: string, content: string): PrecomputedSearchItem {
  return {
    normalizedTitle: normalizeText(title),
    normalizedContent: extractSearchableText(content),
  };
}

export function scoreSearch(item: PrecomputedSearchItem, query: string): number {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const terms = normalizedQuery.split(" ").filter(Boolean);
  if (terms.length === 0) return 0;

  let score = 0;
  for (const term of terms) {
    const titleCount = countOccurrences(item.normalizedTitle, term);
    const contentCount = countOccurrences(item.normalizedContent, term);
    score += titleCount * 12;
    score += contentCount * 3;
    if (item.normalizedTitle.startsWith(term)) score += 8;
  }

  if (item.normalizedTitle.includes(normalizedQuery)) score += 10;
  if (item.normalizedContent.includes(normalizedQuery)) score += 4;

  return score;
}

export function scoreByTitleAndContent(title: string, content: string, query: string): number {
  return scoreSearch(precomputeSearchItem(title, content), query);
}
