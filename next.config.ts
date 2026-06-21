import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // Disable compression since Cloudflare compresses all assets at the Edge
  compress: false,
  // Prevent OOM errors on Netlify by disabling linting/typescript during the final build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Silences Turbopack error when using webpack plugins like PWA
  // @ts-ignore
  turbopack: {},
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@vercel/og/dist/yoga.wasm",
      "node_modules/@vercel/og/dist/resvg.wasm",
      "node_modules/@vercel/og/dist/index.edge.js"
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 'allanime.day' },
      { protocol: 'https', hostname: 'static.animesho.one' },
      { protocol: 'https', hostname: 'aniwatchtv.to' },
      { protocol: 'https', hostname: 'hianime.to' },
      { protocol: 'https', hostname: 'img.hianime.to' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'img.anikai.to' },
      { protocol: 'https', hostname: 'static.anikai.to' },
      { protocol: 'https', hostname: 'media.kitsu.io' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'artworks.thetvdb.com' },
      { protocol: 'https', hostname: 'wp.youtube-anime.com' },
      { protocol: 'https', hostname: 'allmanga.to' },
      { protocol: 'https', hostname: 'gogocdn.net' },
      { protocol: 'https', hostname: 'img.netto.com' },
      { protocol: 'https', hostname: 'embed.su' },
      { protocol: 'https', hostname: 'player.autoembed.cc' },
      { protocol: 'https', hostname: 'dl.vidsrc.vip' },
      { protocol: 'https', hostname: 'vidfast.pro' },
      { protocol: 'https', hostname: 'vidstorm.ru' },
      { protocol: 'https', hostname: 'autoembed.co' },
      { protocol: 'https', hostname: 'vidsrc.xyz' },
      { protocol: 'https', hostname: 'player.smashy.stream' },
      { protocol: 'https', hostname: 'cineby.pro' },
      { protocol: 'https', hostname: 'vidsrc.to' },
      { protocol: 'https', hostname: 'vidsrc.pro' },
      { protocol: 'https', hostname: 'peachify.top' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), fullscreen=(self "https://vidlink.pro" "https://vidsrc.to" "https://vidsrc.pro" "https://vidsrc.me" "https://autoembed.co" "https://cineby.pro" "https://vidfast.pro" "https://peachify.top" "https://multiembed.mov" "https://embed.su" "https://megacloud.tv" "https://rapid-cloud.co")',
          },
        ],
      },
      {
        // Watch page: relax restrictions so all embed iframes can load and go fullscreen
        source: '/watch/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https:",
              "connect-src 'self' https: wss:",
              "frame-src *",
              "worker-src 'self' blob:",
              "font-src 'self' data: https:",
              "object-src 'none'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'fullscreen=*, autoplay=*, encrypted-media=*, picture-in-picture=*',
          },
        ],
      },
      {
        // Proxy embed route: return permissive headers so browser loads iframes freely
        source: '/api/proxy/embed',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
    ];
  }
};

export default withPWA(nextConfig);
