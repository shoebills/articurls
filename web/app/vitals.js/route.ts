import { proxyUmamiScript } from "@/lib/umami-server";

/**
 * Neutral first-party Umami tracker script proxy.
 * Rewrites `/api/send` inside the upstream script to `/site-vitals` so neither
 * ad-blockers nor subfolder reverse proxies drop pageview events.
 */
export async function GET() {
  return proxyUmamiScript();
}
