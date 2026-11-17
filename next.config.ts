import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let a phone on the same Wi-Fi use the dev server (this PC's LAN IP; update it if the IP changes).
  allowedDevOrigins: ["192.168.0.101"],
  cacheComponents: true,
  // Off so the tab bar's prefetch={true} loads each tab's data, not just its shell: taps open instantly.
  partialPrefetching: false,
  experimental: {
    // Keep pages you've opened for 5 minutes, so switching back is instant.
    // Logging in chat or editing calls router.refresh(), which drops them, so numbers stay fresh.
    staleTimes: { dynamic: 300, static: 300 },
    // Progress photos are shrunk on the phone first; this leaves room for a big one.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
