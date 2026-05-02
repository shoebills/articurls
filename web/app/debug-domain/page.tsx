import { headers } from "next/headers";

export default async function DebugDomainPage() {
  const h = await headers();
  const xOriginalHost = h.get("x-original-host");
  const host = h.get("host");
  const xMatchedPath = h.get("x-matched-path");

  let lookupResult: unknown = null;
  if (xOriginalHost) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(xOriginalHost)}`,
        { cache: "no-store", headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET || "" } }
      );
      lookupResult = { status: res.status, body: await res.text() };
    } catch (e) {
      lookupResult = { error: String(e) };
    }
  }

  return (
    <pre style={{ fontFamily: "monospace", padding: "2rem", fontSize: "0.85rem" }}>
      {JSON.stringify({
        "1_x-original-host": xOriginalHost,
        "2_host": host,
        "3_x-matched-path": xMatchedPath,
        "4_lookup": lookupResult,
        "5_note": xMatchedPath?.startsWith("/custom-domain")
          ? "✅ Middleware rewrite is working"
          : "❌ Middleware did NOT rewrite — matched path-based route directly",
      }, null, 2)}
    </pre>
  );
}
