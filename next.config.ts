import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks dev HMR as cross-origin when the browser reaches the server
  // on a different loopback host than it binds (127.0.0.1 vs localhost). The
  // smoke suite drives 127.0.0.1, so allow both — dev only, no effect on a build.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
