import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
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
          '/about',
          '/privacy',
          '/terms',
          '/contact'
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
          '/watchlist'
        ],
      },
      ...['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai', 'Claude-Web', 'PerplexityBot'].map(agent => ({
        userAgent: agent,
        allow: '/',
      }))
    ],
    sitemap: 'https://www.toonplayer.in/sitemap.xml',
  }
}
