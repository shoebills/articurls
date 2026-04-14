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

export function isMainHost(host: string): boolean {
  const normalized = host.toLowerCase().split(":")[0];
  if (getMainHosts().has(normalized)) return true;
  if (normalized.endsWith(".localhost")) return true;
  return false;
}
