import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Worker-native SMTP off the Next/OpenNext esbuild graph so
  // `cloudflare:sockets` is resolved by workerd at runtime.
  serverExternalPackages: ["@workermailer/smtp"],
  images: {
    remotePatterns: [
      {
        hostname: "time-restricted.com",
        pathname: "/wp-content/uploads/**",
        protocol: "https",
      },
      {
        hostname: "api.time-restricted.com",
        pathname: "/wp-content/uploads/**",
        protocol: "https",
      },
      {
        hostname: "time-restricted.com",
        pathname: "/wp-content/uploads/**",
        protocol: "http",
      },
      {
        hostname: "api.time-restricted.com",
        pathname: "/wp-content/uploads/**",
        protocol: "http",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;

// Only for `next dev` — bindings/preview helpers; skip during `next build`.
if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare").then(
    ({ initOpenNextCloudflareForDev }) => {
      initOpenNextCloudflareForDev();
    },
  );
}
