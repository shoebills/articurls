import { proxyUmamiSend } from "@/lib/umami-server";

/** Neutral first-party Umami collection proxy (paired with `/vitals.js`). */
export async function POST(request: Request) {
  return proxyUmamiSend(request);
}

export function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}
