import { NextResponse } from "next/server";
import { AnimeProviderManager, isValidVideoSource, normalizeProvider } from "@/lib/providers/AnimeProviderManager";
import { animeCache, cacheKey, TTL } from "@/lib/anime-cache";
import type { VideoSource } from "@/lib/providers/types";

export async function GET(request: Request) {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get("id");
    const rawEp = searchParams.get("ep");
    const rawMode = searchParams.get("mode") as 'sub' | 'dub' | 'raw' | null;
    const rawProvider = searchParams.get("provider");
    const serverId = searchParams.get("serverId") || undefined;
    const rawMalId = searchParams.get("malId");
    const title = searchParams.get("title") || undefined;

    // STEP 1: NORMALIZE INPUT
    if (!rawId || !rawEp) {
        return NextResponse.json(
            { 
                success: false, 
                error: "Show ID and Episode Number are required", 
                code: "INVALID_PARAMETERS",
                sources: [], 
                links: [] 
            }, 
            { status: 400 }
        );
    }

    const cleanId = rawId.trim();
    // Parse episode number safely
    let cleanEp = rawEp.trim();
    if (cleanEp.includes('episode-')) {
        const match = cleanEp.match(/episode-(\d+)/);
        if (match) cleanEp = match[1];
    } else if (cleanEp.includes('ep-')) {
        const match = cleanEp.match(/ep-(\d+)/);
        if (match) cleanEp = match[1];
    } else if (/^\d+(\.\d+)?$/.test(cleanEp)) {
        cleanEp = String(parseFloat(cleanEp));
    }

    const mode: 'sub' | 'dub' | 'raw' = rawMode && ['sub', 'dub', 'raw'].includes(rawMode) ? rawMode : 'sub';
    const normalizedProvider = rawProvider ? normalizeProvider(rawProvider) : undefined;
    const parsedMalId = rawMalId && /^\d+$/.test(rawMalId) ? parseInt(rawMalId, 10) : undefined;

    console.log(`[SourceResolver] 🚀 [START] animeId=${cleanId} ep=${cleanEp} mode=${mode} provider=${normalizedProvider || 'auto'} server=${serverId || 'auto'}`);

    // STEP 7: CACHING
    const cacheKeyStr = `${cacheKey.sources(cleanId, cleanEp, mode)}:${normalizedProvider || 'auto'}:${serverId || 'auto'}`;
    const cachedSources = animeCache.get<any[]>(cacheKeyStr);
    if (cachedSources && Array.isArray(cachedSources) && cachedSources.length > 0) {
        console.log(`[SourceResolver] ⚡ [CACHE_HIT] Resolved ${cachedSources.length} sources from in-memory cache for ${cleanId} ep ${cleanEp}`);
        return NextResponse.json({
            success: true,
            cached: true,
            animeId: cleanId,
            episode: cleanEp,
            mode,
            count: cachedSources.length,
            sources: cachedSources,
            links: cachedSources
        });
    }

    const collectedSources: VideoSource[] = [];
    const seenUrls = new Set<string>();

    // STEP 9: MULTI-TIER FALLBACK PIPELINE

    // TIER 1: Dedicated Scrapers via AnimeProviderManager
    try {
        const managerSources = await AnimeProviderManager.getSources(
            cleanId,
            cleanEp,
            mode,
            normalizedProvider,
            serverId,
            parsedMalId
        );

        if (managerSources && managerSources.length > 0) {
            for (const s of managerSources) {
                if (isValidVideoSource(s)) {
                    const url = s.url || (s as any).link;
                    if (!seenUrls.has(url)) {
                        seenUrls.add(url);
                        collectedSources.push(s);
                    }
                }
            }
        }
    } catch (err: any) {
        console.warn(`[SourceResolver] ⚠️ Tier 1 (ProviderManager) failed for ${cleanId} ep ${cleanEp}:`, err.message);
    }

    // TIER 2: AMVSTR Direct Stream API (if no scraper sources found)
    if (collectedSources.length === 0 && /^\d+$/.test(cleanId)) {
        try {
            const amvstrRes = await Promise.race([
                fetch(`https://api.amvstr.me/api/v2/stream/${cleanId}/${cleanEp}`, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(4000)
                }),
                new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('AMVSTR Timeout')), 4000))
            ]);

            if (amvstrRes.ok) {
                const amvstrData = await amvstrRes.json();
                const streamUrl = amvstrData?.stream?.multi?.main?.url || amvstrData?.stream?.nspl?.main?.url;
                if (streamUrl && isValidVideoSource({ url: streamUrl })) {
                    if (!seenUrls.has(streamUrl)) {
                        seenUrls.add(streamUrl);
                        collectedSources.push({
                            url: streamUrl,
                            isM3U8: true,
                            quality: 'Auto (AMVSTR)',
                            isIframe: false,
                            server: 'amvstr',
                            type: mode
                        });
                    }
                }
            }
        } catch (amvstrErr: any) {
            console.warn(`[SourceResolver] ⚠️ Tier 2 (AMVSTR) failed:`, amvstrErr.message);
        }
    }

    // TIER 3: Multi-Embed Fallbacks using MAL / AniList ID
    if (collectedSources.length === 0) {
        let finalMalId = parsedMalId;
        if (!finalMalId && /^\d+$/.test(cleanId)) {
            try {
                const query = `query ($id: Int) { Media (id: $id, type: ANIME) { idMal } }`;
                const res = await Promise.race([
                    fetch('https://graphql.anilist.co', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query, variables: { id: parseInt(cleanId, 10) } }),
                        signal: AbortSignal.timeout(3000)
                    }),
                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('AniList GraphQL Timeout')), 3000))
                ]);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.data?.Media?.idMal) {
                        finalMalId = data.data.Media.idMal;
                    }
                }
            } catch (_) {}
        }

        if (finalMalId) {
            const embedSources: VideoSource[] = [
                {
                    url: `https://vidsrc.cc/v2/embed/anime/${finalMalId}/${cleanEp}`,
                    quality: 'VidSrc.cc',
                    isM3U8: false,
                    isIframe: true,
                    server: 'vidsrc_cc',
                    type: mode
                },
                {
                    url: `https://vidsrc.to/embed/anime/${finalMalId}/${cleanEp}`,
                    quality: 'VidSrc.to',
                    isM3U8: false,
                    isIframe: true,
                    server: 'vidsrc_to',
                    type: mode
                },
                {
                    url: `https://vidsrc.me/embed/anime?mal=${finalMalId}&episode=${cleanEp}`,
                    quality: 'VidSrc.me',
                    isM3U8: false,
                    isIframe: true,
                    server: 'vidsrc_me',
                    type: mode
                },
                {
                    url: `https://animeplayer.pt/api/embed?id=${finalMalId}&episode=${cleanEp}`,
                    quality: 'AnimePlayer',
                    isM3U8: false,
                    isIframe: true,
                    server: 'animeplayer',
                    type: mode
                }
            ];

            for (const s of embedSources) {
                if (!seenUrls.has(s.url)) {
                    seenUrls.add(s.url);
                    collectedSources.push(s);
                }
            }
        }
    }

    // STEP 6: SOURCE NORMALIZATION
    const normalizedSources = collectedSources.map((s, idx) => {
        const url = s.url || (s as any).link;
        const isM3U8 = Boolean(s.isM3U8 || (s as any).hls || url.includes('.m3u8'));
        const isIframe = Boolean(s.isIframe);
        const type = isIframe ? 'iframe' : isM3U8 ? 'hls' : 'mp4';
        const quality = s.quality || (s as any).resolutionStr || 'Auto';
        const serverName = s.server || (s as any).provider || 'anime';

        return {
            id: `${serverName}-${idx}`,
            provider: serverName,
            url,
            type,
            quality,
            language: s.type || mode,
            subtitles: (s as any).subtitles || [],
            headers: s.headers,
            isIframe,
            isM3U8,
            // Backwards-compatibility fields for existing components:
            link: url,
            hls: isM3U8,
            resolutionStr: quality
        };
    });

    const duration = Date.now() - startTime;

    if (normalizedSources.length > 0) {
        // Cache successful response for 5 minutes
        animeCache.set(cacheKeyStr, normalizedSources, TTL.SOURCES);
        console.log(`[SourceResolver] 🏁 [COMPLETE] Successfully resolved ${normalizedSources.length} sources for ${cleanId} ep ${cleanEp} in ${duration}ms`);

        return NextResponse.json({
            success: true,
            cached: false,
            animeId: cleanId,
            episode: cleanEp,
            mode,
            durationMs: duration,
            count: normalizedSources.length,
            sources: normalizedSources,
            links: normalizedSources
        });
    }

    console.warn(`[SourceResolver] ❌ [NO_SOURCES] Failed to resolve any valid sources for ${cleanId} ep ${cleanEp} after ${duration}ms`);

    return NextResponse.json({
        success: false,
        error: `No playable sources found for episode ${cleanEp}`,
        code: "NO_SOURCES_AVAILABLE",
        animeId: cleanId,
        episode: cleanEp,
        mode,
        durationMs: duration,
        count: 0,
        sources: [],
        links: []
    });
}
