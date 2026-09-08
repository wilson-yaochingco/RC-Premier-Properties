import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function createNextConfig(phase: string): NextConfig {
  const securityHeaders = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    ...(phase === PHASE_DEVELOPMENT_SERVER
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ]),
  ];

  return {
    poweredByHeader: false,
    images: {
      formats: ["image/avif", "image/webp"],
      remotePatterns: [
        {
          protocol: "https",
          hostname: "images.unsplash.com",
          port: "",
          pathname: "/photo-**",
        },
      ],
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: securityHeaders,
        },
        {
          source: "/admin/:path*",
          headers: [
            { key: "Cache-Control", value: "private, no-store, max-age=0" },
            { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          ],
        },
        {
          source: "/geo/:path*",
          headers: [
            {
              key: "Cache-Control",
              value:
                "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
            },
          ],
        },
      ];
    },
  };
}
