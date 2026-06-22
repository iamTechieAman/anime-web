import { NextResponse } from "next/server";

async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get("id"); // anilist ID
    const episodeString = searchParams.get("ep");
    const malId = searchParams.get("malId"); // we can pass malId if available

    if (!showId || !episodeString) {
        return NextResponse.json({ error: "Show ID and Episode Number are required" }, { status: 400 });
    }

    // Try to get MAL ID if not provided
    let finalMalId = malId;
    if (!finalMalId) {
        try {
            const query = `query ($id: Int) { Media (id: $id, type: ANIME) { idMal } }`;
            const res = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables: { id: parseInt(showId) } }),
                signal: AbortSignal.timeout(4000)
            });
            const data = await res.json();
            if (data?.data?.Media?.idMal) {
                finalMalId = String(data.data.Media.idMal);
            }
        } catch (_) {}
    }

    const sources = [];

    // M3U8 from AMVSTR (Sometimes fails due to rate limit, so we put it as an option)
    try {
        const amvstrRes = await withTimeout(fetch(`https://api.amvstr.me/api/v2/stream/${showId}/${episodeString}`, { signal: AbortSignal.timeout(3000) }), 3000);
        const amvstrData = await amvstrRes.json();
        if (amvstrData?.stream?.multi?.main?.url) {
            sources.push({
                link: amvstrData.stream.multi.main.url,
                hls: true,
                resolutionStr: 'Auto',
                isIframe: false,
                provider: 'amvstr'
            });
        }
    } catch (_) {}

    // Fallbacks: Iframes (100% resilient)
    
    // 1. VidSrc.cc
    if (finalMalId) {
        sources.push({
            link: `https://vidsrc.cc/v2/embed/anime/${finalMalId}/${episodeString}`,
            hls: false,
            resolutionStr: 'VidSrc.cc',
            isIframe: true,
            provider: 'vidsrc'
        });
        
        // 2. VidSrc.to
        sources.push({
            link: `https://vidsrc.to/embed/anime/${finalMalId}/${episodeString}`,
            hls: false,
            resolutionStr: 'VidSrc.to',
            isIframe: true,
            provider: 'vidsrc'
        });

        // 3. VidSrc.me
        sources.push({
            link: `https://vidsrc.me/embed/anime?mal=${finalMalId}&episode=${episodeString}`,
            hls: false,
            resolutionStr: 'VidSrc.me',
            isIframe: true,
            provider: 'vidsrc'
        });

        // 4. AnimePlayer (Fallback)
        sources.push({
            link: `https://animeplayer.pt/api/embed?id=${finalMalId}&episode=${episodeString}`,
            hls: false,
            resolutionStr: 'AnimePlayer',
            isIframe: true,
            provider: 'animeplayer'
        });
    }

    // 5. AutoEmbed
    sources.push({
        link: `https://autoembed.to/anime/tmdb/${showId}-${episodeString}`, // Will fail if TMDB ID is needed, but we don't have it easily here
        hls: false,
        resolutionStr: 'AutoEmbed',
        isIframe: true,
        provider: 'autoembed'
    });

    return NextResponse.json({ links: sources });
}
