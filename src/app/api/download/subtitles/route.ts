import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/download/subtitles
 *
 * Subtitle download proxy.
 * Fetches subtitle file server-side and forces browser download.
 * Auto-converts SRT/ASS → VTT (same logic as /api/proxy/subtitles).
 *
 * Query params:
 * - url=<encoded>       (required) — subtitle URL
 * - filename=<name>     (optional) — download filename (default: subtitles.vtt)
 * - format=vtt|raw      (optional) — force VTT conversion or return raw
 */

function srtToVtt(srt: string): string {
    const vtt = srt
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
        .replace(/^\uFEFF/, '');
    return 'WEBVTT\n\n' + vtt;
}

function assToVtt(ass: string): string {
    const lines = ass.split('\n');
    const dialogues: string[] = [];
    let index = 1;
    for (const line of lines) {
        if (!line.startsWith('Dialogue:')) continue;
        const parts = line.replace('Dialogue:', '').split(',');
        if (parts.length < 10) continue;
        const start = parts[1].trim().replace('.', ':').replace(/(\d):(\d{2}:\d{2}\.\d{2})/, '0$1:$2');
        const end = parts[2].trim().replace('.', ':').replace(/(\d):(\d{2}:\d{2}\.\d{2})/, '0$1:$2');
        const text = parts.slice(9).join(',').trim()
            .replace(/\{[^}]+\}/g, '')
            .replace(/\\N/g, '\n')
            .replace(/\\n/g, '\n');
        if (!text) continue;
        dialogues.push(`${index}\n${start} --> ${end}\n${text}\n`);
        index++;
    }
    return 'WEBVTT\n\n' + dialogues.join('\n');
}

function safeFilename(raw: string | null, url: string, defaultExt: string): string {
    if (raw) return raw.replace(/[^a-zA-Z0-9._\-\s]/g, '').trim() || `subtitles.${defaultExt}`;
    try {
        const path = new URL(url).pathname;
        const last = path.split('/').pop() || `subtitles.${defaultExt}`;
        return last.split('?')[0];
    } catch {
        return `subtitles.${defaultExt}`;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const rawUrl = searchParams.get('url');
    const rawFilename = searchParams.get('filename');
    const format = searchParams.get('format') || 'vtt';

    if (!rawUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const targetUrl = decodeURIComponent(rawUrl);
    const ext = targetUrl.split('?')[0].split('.').pop()?.toLowerCase();
    const outputExt = format === 'raw' ? (ext || 'vtt') : 'vtt';
    const filename = safeFilename(rawFilename, targetUrl, outputExt);

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ToonPlayer/1.0)',
                'Accept': 'text/vtt,text/plain,application/x-subrip,*/*',
                'Referer': new URL(targetUrl).origin + '/',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Upstream returned ${response.status}` }, { status: response.status });
        }

        let content = await response.text();
        let contentType = 'text/vtt; charset=utf-8';

        if (format !== 'raw') {
            if (ext === 'srt' || (!content.startsWith('WEBVTT') && content.match(/^\d+\n\d{2}:\d{2}:\d{2}/m))) {
                content = srtToVtt(content);
            } else if (ext === 'ass' || ext === 'ssa' || content.includes('[Script Info]')) {
                content = assToVtt(content);
            } else if (!content.startsWith('WEBVTT')) {
                content = 'WEBVTT\n\n' + content;
            }
        } else {
            contentType = response.headers.get('Content-Type') || 'text/plain; charset=utf-8';
        }

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
            },
        });

    } catch (err: any) {
        console.error('[DownloadProxy/subtitles] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 502 });
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
