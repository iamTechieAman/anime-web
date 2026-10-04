import { NextResponse } from "next/server";
import { AnimeProviderManager, normalizeProvider } from "@/lib/providers/AnimeProviderManager";
import { animeCache, cacheKey, TTL } from "@/lib/anime-cache";

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: Request) {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get("id");
    const rawEp = searchParams.get("ep");
    const rawMode = searchParams.get("mode") as 'sub' | 'dub' | 'raw' | null;
    const rawProvider = searchParams.get("provider");
    const serverId = searchParams.get("serverId") || undefined;
    const rawMalId = searchParams.get("malId");

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

    console.log(`[SourceRoute] 🚀 [START] animeId=${cleanId} ep=${cleanEp} mode=${mode} provider=${normalizedProvider || 'auto'} server=${serverId || 'auto'}`);

    // STEP 2: CACHE CHECK
    const cacheKeyStr = `${cacheKey.sources(cleanId, cleanEp, mode)}:${normalizedProvider || 'auto'}:${serverId || 'auto'}`;
    const cachedSources = animeCache.get<any[]>(cacheKeyStr);
    if (cachedSources && Array.isArray(cachedSources) && cachedSources.length > 0) {
        console.log(`[SourceRoute] ⚡ [CACHE_HIT] Resolved ${cachedSources.length} sources from cache for ${cleanId} ep ${cleanEp}`);
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

    // STEP 3: RESOLVE SOURCES VIA PROVIDER MANAGER
    const resolution = await AnimeProviderManager.resolveSourcesWithDiagnostics(
        cleanId,
        cleanEp,
        mode,
        normalizedProvider,
        serverId,
        parsedMalId
    );

    // STEP 4: NORMALIZE SOURCES FOR CLIENT
    const normalizedSources = resolution.sources.map((s, idx) => {
        const url = s.url || (s as any).link;
        const isM3U8 = Boolean(s.isM3U8 || (s as any).hls || url.includes('.m3u8'));
        const isIframe = Boolean(s.isIframe);
        const type = isIframe ? 'iframe' : isM3U8 ? 'hls' : 'mp4';
        const quality = s.quality || (s as any).resolutionStr || 'Auto';
        const serverName = s.server || (s as any).provider || 'anime';
        const providerId = s.providerId || serverName;

        return {
            id: `${serverName}-${idx}`,
            provider: serverName,
            providerId,
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
        // Cache successful response
        animeCache.set(cacheKeyStr, normalizedSources, TTL.SOURCES);
        console.log(`[SourceRoute] 🏁 [COMPLETE] Resolved ${normalizedSources.length} sources for ${cleanId} ep ${cleanEp} via tier ${resolution.tier} [${resolution.resolvedBy.join(', ')}] in ${duration}ms`);

        const response: Record<string, any> = {
            success: true,
            cached: false,
            animeId: cleanId,
            episode: cleanEp,
            mode,
            durationMs: duration,
            count: normalizedSources.length,
            resolvedBy: resolution.resolvedBy,
            tier: resolution.tier,
            sources: normalizedSources,
            links: normalizedSources,
        };

        // Include per-provider diagnostics in dev mode
        if (isDev) {
            response.diagnostics = resolution.providerResults.map(pr => ({
                provider: pr.provider,
                status: pr.status,
                sourceCount: pr.sources.length,
                durationMs: pr.durationMs,
                error: pr.error ? { code: pr.error.code, message: pr.error.message } : undefined,
            }));
        }

        return NextResponse.json(response);
    }

    // ALL PROVIDERS FAILED
    console.warn(`[SourceRoute] ❌ [NO_SOURCES] Failed to resolve sources for ${cleanId} ep ${cleanEp} after ${duration}ms`);

    const failureResponse: Record<string, any> = {
        success: false,
        error: `No playable sources found for episode ${cleanEp}`,
        code: "NO_SOURCES_AVAILABLE",
        animeId: cleanId,
        episode: cleanEp,
        mode,
        durationMs: duration,
        count: 0,
        sources: [],
        links: [],
    };

    // Include diagnostics in dev mode for debugging
    if (isDev) {
        failureResponse.diagnostics = resolution.providerResults.map(pr => ({
            provider: pr.provider,
            status: pr.status,
            sourceCount: pr.sources.length,
            durationMs: pr.durationMs,
            error: pr.error ? { code: pr.error.code, message: pr.error.message } : undefined,
        }));
        failureResponse.errorSummary = resolution.errorSummary;
    }

    return NextResponse.json(failureResponse);
}
