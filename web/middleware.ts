import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MAIN_HOSTS = [
  "articurls.com",
  "www.articurls.com",
  "app.articurls.com",
  "localhost",
  "127.0.0.1",
];

function mainHosts(): Set<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_MAIN_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_MAIN_HOSTS, ...fromEnv]);
}

function isMainHost(host: string): boolean {
  const normalized = host.toLowerCase().split(":")[0];
  if (mainHosts().has(normalized)) return true;
  if (normalized.endsWith(".localhost")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/custom-domain") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  if (!isMainHost(host)) {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = `/custom-domain${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
