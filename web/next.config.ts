import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["myblog.localtest.me"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
