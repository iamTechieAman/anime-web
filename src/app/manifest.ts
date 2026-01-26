import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ToonPlayer',
        short_name: 'ToonPlayer',
        description: 'Premium Anime Streaming Platform',
        start_url: '/',
        display: 'standalone',
        background_color: '#050505',
        theme_color: '#a855f7',
        icons: [
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
