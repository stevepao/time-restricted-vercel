import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "time-restricted.com",
        pathname: "/wp-content/uploads/**",
        protocol: "https",
      },
      {
        hostname: "time-restricted.com",
        pathname: "/wp-content/uploads/**",
        protocol: "http",
      },
    ],
  },
};

export default nextConfig;
