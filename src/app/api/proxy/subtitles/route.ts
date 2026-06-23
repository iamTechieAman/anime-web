import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/proxy/subtitles
 *
 * Server-side subtitle proxy. Fetches VTT, SRT, ASS/SSA subtitle files
 * from external CDNs and returns them with proper CORS headers so the
 * browser <track> element and HLS.js can load cross-origin subtitles.
 *
 * Supported formats: WebVTT (.vtt), SubRip (.srt), ASS/SSA (.ass, .ssa)
 * Auto-converts SRT → VTT on the fly for native browser track element support.
 *
 * Usage: /api/proxy/subtitles?url=<encoded_subtitle_url>&format=vtt
 */

// Allowed subtitle CDN origins (security guard)
const ALLOWED_SUBTITLE_ORIGINS = [
    // Gogoanime / GogoAnime CDN
    'gogocdn.net',
    'playtaku.net',
    // AllAnime
    'allanime.day',
    'youtube-anime.com',
    // HiAnime / Zoro
    'hianime.to',
    'hianime.lol',
    'zoro.to',
    's.megacloud.tv',
    'megacloud.tv',
    // AniList
    'media.aniwatch.me',
    // AnimePahe
    'animepahe.ru',
    'animepahe.com',
    'animepahe.org',
    // Crunchyroll
    'static.crunchyroll.com',
    'pl.crunchyroll.com',
    // General CDNs
    'cdn.jsdelivr.net',
    'raw.githubusercontent.com',
    'subtitle-sxm.github.io',
    'jimaku.cc',
    'kitsunekko.net',
    // CORS-Anywhere style
    'subsource.net',
    'animetosho.org',
];

function isAllowed(url: string): boolean {
    try {
        const host = new URL(url).hostname;
        return ALLOWED_SUBTITLE_ORIGINS.some(d => host.includes(d));
    } catch {
        return false;
    }
}

/**
 * Convert SRT subtitle format to WebVTT.
 * SRT timing: 00:00:01,000 --> 00:00:05,500
 * VTT timing: 00:00:01.000 --> 00:00:05.500
 */
function srtToVtt(srt: string): string {
    const vtt = srt
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Replace comma decimal separator with period (SRT → VTT timing)
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
        // Remove any BOM
        .replace(/^\uFEFF/, '');

    return 'WEBVTT\n\n' + vtt;
}

/**
 * Minimal ASS/SSA → VTT converter.
 * Strips formatting tags and converts timing blocks.
 */
function assToVtt(ass: string): string {
    const lines = ass.split('\n');
    const dialogues: string[] = [];
    let index = 1;

    for (const line of lines) {
        if (!line.startsWith('Dialogue:')) continue;
        // Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
        const parts = line.replace('Dialogue:', '').split(',');
        if (parts.length < 10) continue;

        const start = parts[1].trim().replace('.', ':').replace(/(\d):(\d{2}:\d{2}\.\d{2})/, '0$1:$2');
        const end = parts[2].trim().replace('.', ':').replace(/(\d):(\d{2}:\d{2}\.\d{2})/, '0$1:$2');
        // Text is everything after the 9th comma
        const text = parts.slice(9).join(',').trim()
            // Remove ASS override tags like {\an8}, {\i1}, etc.
            .replace(/\{[^}]+\}/g, '')
            // Convert \N (newline) to actual newline
            .replace(/\\N/g, '\n')
            .replace(/\\n/g, '\n');

        if (!text) continue;
        dialogues.push(`${index}\n${start} --> ${end}\n${text}\n`);
        index++;
    }

    return 'WEBVTT\n\n' + dialogues.join('\n');
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const targetUrl = searchParams.get('url');
    const forceFormat = searchParams.get('format'); // 'vtt' | 'raw'

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    const decoded = decodeURIComponent(targetUrl);

    // For non-whitelisted origins, try anyway (some providers use unusual CDNs)
    // but log a warning
    if (!isAllowed(decoded)) {
        console.warn(`[SubtitleProxy] Non-whitelisted origin: ${decoded.substring(0, 80)}`);
    }

    const ext = decoded.split('?')[0].split('.').pop()?.toLowerCase();

    try {
        const response = await fetch(decoded, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ToonPlayer/1.0)',
                'Accept': 'text/vtt,text/plain,application/x-subrip,*/*',
                'Referer': new URL(decoded).origin + '/',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            return new NextResponse(null, { status: response.status });
        }

        let content = await response.text();
        let contentType = 'text/vtt; charset=utf-8';

        // Auto-convert to VTT unless raw is requested
        if (forceFormat !== 'raw') {
            if (ext === 'srt' || (!content.startsWith('WEBVTT') && content.match(/^\d+\n\d{2}:\d{2}:\d{2}/m))) {
                // SRT format
                content = srtToVtt(content);
            } else if (ext === 'ass' || ext === 'ssa' || content.includes('[Script Info]')) {
                // ASS/SSA format
                content = assToVtt(content);
            } else if (!content.startsWith('WEBVTT')) {
                // Unknown — add VTT header anyway to help browsers parse it
                content = 'WEBVTT\n\n' + content;
            }
        } else {
            // Raw mode — return as-is with original content type
            contentType = response.headers.get('Content-Type') || 'text/plain; charset=utf-8';
        }

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Range',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                'X-Proxied-Subtitle': decoded.substring(0, 100),
            },
        });

    } catch (err: any) {
        console.error('[SubtitleProxy] Error:', err.message);
        return new NextResponse(`Subtitle proxy error: ${err.message}`, { status: 500 });
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
