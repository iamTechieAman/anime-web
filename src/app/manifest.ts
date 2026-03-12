import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ToonPlayer',
        short_name: 'ToonPlayer',
        description: 'Premium Anime & Movies Streaming',
        start_url: '/',
        display: 'standalone',
        background_color: '#050505',
        theme_color: '#a855f7',
        orientation: 'portrait',
        categories: ['entertainment', 'social'],
        icons: [
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}
