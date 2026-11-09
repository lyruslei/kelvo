import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let a phone on the same Wi-Fi use the dev server (this PC's LAN IP; update it if the IP changes).
  allowedDevOrigins: ["192.168.0.101"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
