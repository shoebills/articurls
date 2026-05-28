import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "http", hostname: "localhost", pathname: "/uploads/**" },
  { protocol: "http", hostname: "127.0.0.1", pathname: "/uploads/**" },
];

const r2Public = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
if (r2Public) {
  try {
    const u = new URL(r2Public);
    const protocol = u.protocol === "https:" ? "https" : "http";
    remotePatterns.push({
      protocol,
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
      pathname: "/**",
    });
  } catch {
    // Invalid URL: skip extra pattern
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.106.108.92"],
  trailingSlash: false,  // Enforce no trailing slash with 308 redirects
  images: {
    remotePatterns,
  },
  experimental: {
    // Inline CSS to eliminate render-blocking CSS requests (Next.js 15+)
    inlineCss: true,
  },
  compiler: {
    // Remove console.log in production to reduce bundle size
    removeConsole: {
      exclude: ["error"],
    },
  },
};

export default nextConfig;
