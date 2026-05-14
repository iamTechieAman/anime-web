import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/login', '/register', '/profile', '/watchlist'],
      },
      ...['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai', 'Claude-Web', 'PerplexityBot'].map(agent => ({
        userAgent: agent,
        allow: '/',
      }))
    ],
    sitemap: 'https://toonplayer.in/sitemap.xml',
  }
}
