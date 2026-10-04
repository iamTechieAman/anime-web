// @ts-ignore
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/anime',
          '/movies',
          '/tv',
          '/trending',
          '/top-rated',
          '/genres',
          '/watch/*',
          '/cartoon/*',
          '/az-list/*',
          '/search',
          '/about',
          '/privacy',
          '/terms',
          '/contact',
        ],
        disallow: [
          '/login',
          '/profile',
          '/settings',
          '/api/',
          '/_next/',
          '/dashboard',
          '/watch-history',
          '/private',
          '/history',
          '/watchlist',
        ],
      },
      ...['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai', 'Claude-Web', 'PerplexityBot'].map(agent => ({
        userAgent: agent,
        allow: '/',
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
