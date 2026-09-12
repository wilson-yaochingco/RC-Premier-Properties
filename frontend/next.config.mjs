import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import readNextConfigEnvironment from "./src/lib/next-config-env.cjs";

const {
  apiBaseUrl: API_BASE_URL,
  mapTileUrl: MAP_TILE_URL,
  mediaOrigin: MEDIA_ORIGIN,
  publicDeployment,
  preventIndexing,
} = readNextConfigEnvironment();

function originOf(value) {
  return new URL(value).origin;
}

/**
 * Build a provider-aware policy without wildcard hosts. Next.js hydration and the
 * current Leaflet rendering path require inline scripts/styles; production never adds
 * `unsafe-eval`, and externally loaded scripts remain forbidden.
 *
 * @param {{ apiOrigin: string, mapTileOrigin: string, mediaOrigin?: string, upgradeInsecureRequests: boolean }} config
 */
export function buildContentSecurityPolicy(config) {
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    config.mapTileOrigin,
    ...(config.mediaOrigin ? [config.mediaOrigin] : []),
  ];
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src ${imageSources.join(" ")}`,
    `connect-src 'self' ${config.apiOrigin}`,
    "frame-src https://www.youtube-nocookie.com",
    "media-src 'self' https://videos.ctfassets.net",
    "manifest-src 'self'",
  ];
  if (config.upgradeInsecureRequests) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function remoteMediaPattern() {
  if (!MEDIA_ORIGIN) return [];
  const url = new URL(MEDIA_ORIGIN);
  return [
    {
      protocol: url.protocol.slice(0, -1),
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    },
  ];
}

export default function createNextConfig(phase) {
  const optimizedRuntime = phase !== PHASE_DEVELOPMENT_SERVER;
  const securityHeaders = [
    ...(preventIndexing
      ? [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
      : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    ...(optimizedRuntime
      ? [
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy({
              apiOrigin: originOf(API_BASE_URL),
              mapTileOrigin: originOf(MAP_TILE_URL),
              ...(MEDIA_ORIGIN ? { mediaOrigin: MEDIA_ORIGIN } : {}),
              upgradeInsecureRequests: publicDeployment,
            }),
          },
        ]
      : []),
    ...(optimizedRuntime
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ]
      : []),
  ];

  return {
    poweredByHeader: false,
    images: {
      formats: ["image/avif", "image/webp"],
      remotePatterns: [
        ...(!publicDeployment
          ? [
              {
                protocol: "https",
                hostname: "images.unsplash.com",
                port: "",
                pathname: "/photo-**",
              },
            ]
          : []),
        ...remoteMediaPattern(),
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
