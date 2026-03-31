import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // CSP rationale:
            // - unsafe-eval: required by Next.js in development (hot reload).
            //   In production, Next.js still needs it for dynamic code paths
            //   in the App Router runtime. Removing it breaks page hydration.
            // - unsafe-inline (script-src): Next.js injects inline scripts for
            //   page data (__NEXT_DATA__) and chunk preloading. A nonce-based
            //   approach requires custom server middleware not yet implemented.
            // - unsafe-inline (style-src): Tailwind + Next.js styled-jsx inject
            //   inline <style> tags. Removing breaks all component styling.
            // TODO: Migrate to nonce-based CSP when Next.js App Router supports
            //   the `nonce` prop natively (tracked upstream).
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
