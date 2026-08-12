import slugify from "slugify";

export interface TocHeading {
  id: string;
  level: number;
  text: string;
}

const HEADING_PATTERN = /<h([23])\b([^>]*)>(.*?)<\/h\1>/gi;

function uniqueId(text: string, usedIds: Set<string>): string {
  const base = slugify(text, { lower: true, strict: true, trim: true }) || "section";
  let id = base;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `${base}-${counter}`;
    counter++;
  }
  usedIds.add(id);
  return id;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function extractHeadings(html: string): TocHeading[] {
  return processBlogContent(html).headings;
}

export function injectHeadingIds(html: string): { html: string; headings: TocHeading[] } {
  return processBlogContent(html);
}

function processBlogContent(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  const transformed = html.replace(
    HEADING_PATTERN,
    (fullMatch: string, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr);
      const text = stripTags(inner);
      const existingId = attrs.match(/\sid=["']([^"']+)["']/i)?.[1];
      const id = existingId || uniqueId(text || "section", usedIds);

      if (text) {
        headings.push({ id, level, text });
      }

      const hasId = /\sid\s*=/i.test(attrs);
      const newAttrs = hasId ? attrs : `${attrs} id="${id}"`.trim();
      return `<h${level} ${newAttrs}>${inner}</h${level}>`;
    }
  );

  return { html: transformed, headings };
}
