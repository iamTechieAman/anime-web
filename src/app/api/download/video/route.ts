import { NextRequest, NextResponse } from 'next/server';
import { scrampleHeaders } from '@/lib/request-scrambler';
import { isSafeExternalUrl } from '@/lib/sanitizer';

/**
 * GET /api/download/video
 *
 * Server-side video download proxy.
 * Fetches video from CDN server-side with proper Referer/UA headers,
 * then streams to the client as a downloadable attachment.
 *
 * Works for: MP4, WebM, TS segments, and other direct-download formats.
 * Does NOT work for: m3u8/HLS (returns 422 with explanation + copy-link fallback).
 *
 * Query params:
 * - url=<encoded>       (required) — the video CDN URL
 * - filename=<name>     (optional) — download filename, default: episode.mp4
 * - referer=<encoded>   (optional) — override Referer header
 */

// Allowed video CDN origins
const ALLOWED_VIDEO_ORIGINS = [
    'gogocdn.net',
    'playtaku.net',
    'vidstreaming.io',
    'youtube-anime.com',
    'allanime.day',
    'animepahe.ru',
    'kwik.si',
    'files.cache.luluvdo.com',
    'rapid-cloud.co',
    'megacloud.tv',
    'rabbitstream.net',
    'v.vrv.co',
    'a.vrv.co',
];

function isAllowedVideoOrigin(url: string): boolean {
    try {
        const host = new URL(url).hostname;
        return ALLOWED_VIDEO_ORIGINS.some(d => host.includes(d));
    } catch {
        return false;
    }
}

function isHLS(url: string): boolean {
    return url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('playlist');
}

function safeFilename(raw: string | null, url: string): string {
    if (raw) {
        // Sanitize: keep alphanumeric, dashes, underscores, dots
        return raw.replace(/[^a-zA-Z0-9._\-\s]/g, '').trim() || 'episode.mp4';
    }
    // Derive from URL path
    try {
        const path = new URL(url).pathname;
        const last = path.split('/').pop() || 'episode.mp4';
        return last.split('?')[0];
    } catch {
        return 'episode.mp4';
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const rawUrl = searchParams.get('url');
    const rawFilename = searchParams.get('filename');
    const refererOverride = searchParams.get('referer');

    if (!rawUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const targetUrl = decodeURIComponent(rawUrl);

    if (!isSafeExternalUrl(targetUrl)) {
        return NextResponse.json({ error: 'Invalid or forbidden target URL' }, { status: 400 });
    }

    // Reject HLS streams immediately — can't direct-download without ffmpeg
    if (isHLS(targetUrl)) {
        return NextResponse.json({
            error: 'HLS streams cannot be directly downloaded',
            message: 'This stream uses HLS (m3u8) format which requires segment stitching. Copy the stream URL and use VLC or ffmpeg to download it.',
            streamUrl: targetUrl,
            hint: 'ffmpeg -i "<stream_url>" -c copy episode.mp4',
        }, { status: 422 });
    }

    // Security: only allow known CDN origins (or skip check for non-CDN URLs)
    const warn = !isAllowedVideoOrigin(targetUrl);
    if (warn) {
        console.warn(`[DownloadProxy] Non-whitelisted video origin: ${targetUrl.substring(0, 80)}`);
    }

    const filename = safeFilename(rawFilename, targetUrl);

    try {
        // Determine referer from URL pattern
        const referer = refererOverride
            ? decodeURIComponent(refererOverride)
            : (() => {
                try {
                    const host = new URL(targetUrl).hostname;
                    if (host.includes('gogocdn') || host.includes('playtaku')) return 'https://gogoanime.hu';
                    if (host.includes('youtube-anime') || host.includes('allanime')) return 'https://allmanga.to';
                    if (host.includes('animepahe') || host.includes('kwik')) return 'https://animepahe.ru';
                    if (host.includes('megacloud') || host.includes('rapid-cloud')) return 'https://hianime.to';
                    return new URL(targetUrl).origin;
                } catch {
                    return 'https://allmanga.to';
                }
            })();

        const scrambled = scrampleHeaders(referer);
        const fetchHeaders: Record<string, string> = {
            ...scrambled,
            'Range': request.headers.get('range') || 'bytes=0-',
        };

        const response = await fetch(targetUrl, {
            headers: fetchHeaders,
            signal: AbortSignal.timeout(30000), // 30s timeout for large files
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Upstream returned ${response.status}: ${response.statusText}` },
                { status: response.status }
            );
        }

        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const contentLength = response.headers.get('Content-Length');
        const contentRange = response.headers.get('Content-Range');
        const acceptRanges = response.headers.get('Accept-Ranges');

        const responseHeaders: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store', // prevent caching large video files
        };

        if (contentLength) responseHeaders['Content-Length'] = contentLength;
        if (contentRange) responseHeaders['Content-Range'] = contentRange;
        if (acceptRanges) responseHeaders['Accept-Ranges'] = acceptRanges;

        return new NextResponse(response.body, {
            status: contentRange ? 206 : response.status,
            headers: responseHeaders,
        });

    } catch (err: any) {
        console.error('[DownloadProxy/video] Error:', err.message);
        return NextResponse.json(
            { error: 'Download proxy error', message: 'Failed to proxy video stream' },
            { status: 502 }
        );
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
