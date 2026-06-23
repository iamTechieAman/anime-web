import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/proxy/image
 *
 * Proxies anime poster/thumbnail images from external CDNs.
 * - Eliminates mixed-content (http://image) warnings
 * - Adds aggressive browser caching (1 day)
 * - Handles CORS for image elements in the player
 *
 * Usage: /api/proxy/image?url=<encoded_image_url>
 */

// Allowed image CDN origins (security guard)
const ALLOWED_IMAGE_ORIGINS = [
    's4.anilist.co',
    'media.kitsu.app',
    'cdn.myanimelist.net',
    'wp.youtube-anime.com',
    'img.flw.to',
    'cdn.noitatnemucod.net',
    'static.crunchyroll.com',
    'img1.ak.crunchyroll.com',
    'gogocdn.net',
    'playtaku.net',
    'img.animepahe.ru',
    'img.animepahe.com',
    'image.tmdb.org',
    'artworks.thetvdb.com',
    'cdn.animenewsnetwork.com',
    'i.imgur.com',
    'img.hianime.to',
    'img.hianime.lol',
    'hianime.to',
    'hianime.lol',
    'static.animesho.one',
    'allanime.day',
    'cdn.anipixcdn.co',
    'img.anikai.to',
    'static.anikai.to',
    'media.kitsu.io',
    'allmanga.to',
    'img.netto.com',
    'api.dicebear.com',
    'img.clerk.com',
];

function isAllowedImage(url: string): boolean {
    try {
        const host = new URL(url).hostname;
        return ALLOWED_IMAGE_ORIGINS.some(d => host.includes(d));
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    const decoded = decodeURIComponent(targetUrl);

    if (!isAllowedImage(decoded)) {
        // Return a transparent 1x1 PNG rather than an error to avoid broken img tags
        const transparent1x1 = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );
        return new NextResponse(transparent1x1, {
            status: 200,
            headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
        });
    }

    try {
        const response = await fetch(decoded, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ToonPlayer/1.0; +https://toonplayer.vercel.app)',
                'Accept': 'image/webp,image/avif,image/jpeg,image/png,*/*',
                'Referer': new URL(decoded).origin + '/',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            return new NextResponse(null, { status: response.status });
        }

        const contentType = response.headers.get('Content-Type') || 'image/jpeg';
        const imageBuffer = await response.arrayBuffer();

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', // 1 day cache, 1 week stale
                'Access-Control-Allow-Origin': '*',
                'X-Proxied-Image': decoded.substring(0, 100),
            },
        });
    } catch (err: any) {
        console.error('[ImageProxy] Error:', err.message);
        return new NextResponse(null, { status: 502 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
    });
}
