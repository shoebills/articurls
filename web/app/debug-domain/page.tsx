import { headers } from "next/headers";

// Temporary debug page — remove after diagnosing custom domain routing
// Visit https://test.rankowl.io/debug-domain to see what the server receives
export default async function DebugDomainPage() {
  const h = await headers();

  const allHeaders: Record<string, string> = {};
  h.forEach((value, key) => {
    allHeaders[key] = value;
  });

  const xOriginalHost = h.get("x-original-host");
  const host = h.get("host");
  const xForwardedHost = h.get("x-forwarded-host");
  const xForwardedFor = h.get("x-forwarded-for");
  const cfConnectingIp = h.get("cf-connecting-ip");
  const cfRay = h.get("cf-ray");

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Custom Domain Debug</h1>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {[
            ["x-original-host", xOriginalHost],
            ["host", host],
            ["x-forwarded-host", xForwardedHost],
            ["x-forwarded-for", xForwardedFor],
            ["cf-connecting-ip", cfConnectingIp],
            ["cf-ray", cfRay],
          ].map(([key, val]) => (
            <tr key={key} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.5rem 1rem 0.5rem 0", fontWeight: "bold", color: val ? "green" : "red" }}>
                {key}
              </td>
              <td style={{ padding: "0.5rem 0", color: val ? "inherit" : "#999" }}>
                {val ?? "(not set)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <details style={{ marginTop: "2rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>All headers</summary>
        <pre style={{ marginTop: "1rem", background: "#f5f5f5", padding: "1rem", overflow: "auto", fontSize: "0.8rem" }}>
          {JSON.stringify(allHeaders, null, 2)}
        </pre>
      </details>
    </div>
  );
}
