import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/proxy/embed
 *
 * Server-side embed proxy. Fetches a third-party embed URL (megacloud, zoro-embed, etc.)
 * and rewrites all sub-resources through /api/proxy so the browser never makes
 * direct cross-origin requests. Eliminates iframe CORS blocks.
 *
 * Usage: /api/proxy/embed?url=<encoded_embed_url>&referer=<encoded_referer>
 */

// Known anime embed origins and their expected referer
const EMBED_REFERERS: Record<string, string> = {
    'megacloud.tv': 'https://hianime.to',
    'mega.nz': 'https://hianime.to',
    'rapid-cloud.co': 'https://zoro.to',
    'rabbitstream.net': 'https://zoro.to',
    'allanime.day': 'https://allmanga.to',
    'gogocdn.net': 'https://gogoanime.hu',
    'playtaku.net': 'https://gogoanime.hu',
    'vidstreaming.io': 'https://gogoanime.hu',
    'anime-taku.net': 'https://hianime.to',
};

function getRefererForUrl(url: string, override?: string): string {
    if (override) return override;
    try {
        const host = new URL(url).hostname;
        for (const [key, ref] of Object.entries(EMBED_REFERERS)) {
            if (host.includes(key)) return ref;
        }
    } catch (_) {}
    return 'https://hianime.to';
}

// Allowed embed domains — security guard against open-proxy abuse
const ALLOWED_EMBED_ORIGINS = [
    'megacloud.tv', 'rapid-cloud.co', 'rabbitstream.net',
    'allanime.day', 'gogocdn.net', 'playtaku.net',
    'vidstreaming.io', 'anime-taku.net', 'embed.su',
    'player.filemoon.sx', 'filemoon.sx',
    'dood.li', 'doodstream.com',
    'streamlare.com', 'streamtape.com',
];

function isAllowedEmbed(url: string): boolean {
    try {
        const host = new URL(url).hostname;
        return ALLOWED_EMBED_ORIGINS.some(d => host.includes(d));
    } catch (_) {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl;
    const targetUrl = searchParams.get('url');
    const refererOverride = searchParams.get('referer');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Decode if needed
    const decodedUrl = decodeURIComponent(targetUrl);

    if (!isAllowedEmbed(decodedUrl)) {
        return new NextResponse('Embed origin not whitelisted', { status: 403 });
    }

    const referer = getRefererForUrl(decodedUrl, refererOverride || undefined);

    try {
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
                'Referer': referer,
                'Origin': referer,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'cross-site',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            return new NextResponse(`Embed fetch failed: ${response.status} ${response.statusText}`, {
                status: response.status,
            });
        }

        const contentType = response.headers.get('Content-Type') || 'text/html';

        // For non-HTML responses (m3u8, json, etc.), pass through directly
        if (!contentType.includes('text/html')) {
            const headers = new Headers();
            headers.set('Content-Type', contentType);
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('Cache-Control', 'public, max-age=120');
            return new NextResponse(response.body, { status: 200, headers });
        }

        // Rewrite HTML: route all asset URLs through /api/proxy
        let html = await response.text();
        const embedBaseUrl = new URL(decodedUrl);

        // Rewrite absolute URLs from the same origin
        html = html.replace(
            new RegExp(`(src|href|action)=["'](https?://${embedBaseUrl.hostname}[^"']+)["']`, 'g'),
            (_match, attr, url) => `${attr}="${origin}/api/proxy?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}"`
        );

        // Rewrite relative paths (starting with /)
        html = html.replace(
            /(src|href)=["'](\/[^"']+)["']/g,
            (_match, attr, path) => {
                const absolute = `${embedBaseUrl.origin}${path}`;
                return `${attr}="${origin}/api/proxy?url=${encodeURIComponent(absolute)}&referer=${encodeURIComponent(referer)}"`;
            }
        );

        // Inject base tag to handle any remaining relative URLs
        html = html.replace(
            '<head>',
            `<head><base href="${embedBaseUrl.origin}/" />`
        );

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('X-Frame-Options', 'ALLOWALL');
        responseHeaders.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
        responseHeaders.set('X-Proxied-Embed', decodedUrl);

        return new NextResponse(html, { status: 200, headers: responseHeaders });

    } catch (err: any) {
        console.error('[EmbedProxy] Error:', err.message);
        return new NextResponse(`Embed proxy error: ${err.message}`, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Range',
        },
    });
}
