// @ts-ignore
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ToonPlayer — Watch Free Anime, Movies & TV Shows',
        short_name: 'ToonPlayer',
        description: 'Watch anime, movies and TV shows online in HD. Discover trending anime, latest episodes and premium streaming experience on ToonPlayer.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#07080c',
        theme_color: '#0b0b0f',
        orientation: 'any',
        categories: ['entertainment', 'multimedia', 'video'],
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    };
}
