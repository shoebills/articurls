function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export function scoreByTitleAndContent(title: string, content: string, query: string): number {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const normalizedTitle = normalizeText(title);
  const normalizedContent = normalizeText(content);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  if (terms.length === 0) return 0;

  let score = 0;
  for (const term of terms) {
    const titleCount = countOccurrences(normalizedTitle, term);
    const contentCount = countOccurrences(normalizedContent, term);
    score += titleCount * 12;
    score += contentCount * 3;
    if (normalizedTitle.startsWith(term)) score += 8;
  }

  if (normalizedTitle.includes(normalizedQuery)) score += 10;
  if (normalizedContent.includes(normalizedQuery)) score += 4;

  return score;
}
