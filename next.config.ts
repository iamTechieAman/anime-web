import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 'allanime.day' },
      { protocol: 'https', hostname: 'static.animesho.one' },
      { protocol: 'https', hostname: 'aniwatchtv.to' },
      { protocol: 'https', hostname: 'hianime.to' },
      { protocol: 'https', hostname: 'img.hianime.to' },
    ],
  }
};

export default nextConfig;
