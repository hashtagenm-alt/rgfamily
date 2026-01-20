import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname } from "path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: projectRoot,
  },
  reactCompiler: true,
  // Disable Turbopack for production build due to Korean folder name issue
  experimental: {
    // Use webpack for build instead of Turbopack
  },
  // 보안 HTTP 헤더 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS - HTTPS 강제 (1년)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // CSP - Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.dicebear.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  // Route redirects for RG Info consolidation
  async redirects() {
    return [
      // Legacy route redirects
      {
        source: '/organization',
        destination: '/rg/org',
        permanent: true,
      },
      {
        source: '/signature',
        destination: '/rg/sig',
        permanent: true,
      },
      {
        source: '/timeline',
        destination: '/rg/history',
        permanent: true,
      },
      // /info/* -> /rg/* redirects (문서 참조 호환)
      {
        source: '/info/org',
        destination: '/rg/org',
        permanent: true,
      },
      {
        source: '/info/sig',
        destination: '/rg/sig',
        permanent: true,
      },
      {
        source: '/info/timeline',
        destination: '/rg/history',
        permanent: true,
      },
      {
        source: '/info/live',
        destination: '/rg/live',
        permanent: true,
      },
      // Ranking redirects
      {
        source: '/ranking/total',
        destination: '/ranking',
        permanent: true,
      },
      // Community write redirects
      {
        source: '/community/free/write',
        destination: '/community/write?board=free',
        permanent: false,
      },
      {
        source: '/community/vip/write',
        destination: '/community/write?board=vip',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
