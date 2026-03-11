import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      { protocol: 'https', hostname: 'media.kitsu.io' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'artworks.thetvdb.com' },
      { protocol: 'https', hostname: 'wp.youtube-anime.com' },
      { protocol: 'https', hostname: 'allmanga.to' },
      { protocol: 'https', hostname: 'gogocdn.net' },
      { protocol: 'https', hostname: 'img.netto.com' },
    ],
  }
};

export default nextConfig;
