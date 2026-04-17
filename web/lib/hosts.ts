const DEFAULT_MAIN_HOSTS = [
  "articurls.com",
  "www.articurls.com",
  "app.articurls.com",
  "localhost",
  "127.0.0.1",
];

export function getMainHosts(): Set<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_MAIN_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_MAIN_HOSTS, ...fromEnv]);
}

/** RFC1918 IPv4 — used so phone-on-LAN hits marketing/app routes, not custom-domain rewrite. */
function isPrivateLanIPv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function allowLanAsMainHost(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_ALLOW_LAN_MAIN_HOST === "1";
}

export function isMainHost(host: string): boolean {
  const normalized = host.toLowerCase().split(":")[0];
  if (getMainHosts().has(normalized)) return true;
  if (normalized.endsWith(".localhost")) return true;
  if (allowLanAsMainHost() && isPrivateLanIPv4(normalized)) return true;
  return false;
}
