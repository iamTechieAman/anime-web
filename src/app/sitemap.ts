import { MetadataRoute } from 'next'

// In a real app, you would fetch these from your API
const BASE_URL = 'https://anime-web-neon-one.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
    // Static routes
    const routes = [
        '',
        '/watch',
        '/az-list',
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }))

    return [...routes]
}
