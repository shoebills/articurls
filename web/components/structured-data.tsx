import type { StructuredData } from "@/lib/structured-data";

interface StructuredDataProps {
  data: StructuredData | null;
}

export function StructuredData({ data }: StructuredDataProps) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2),
      }}
    />
  );
}
