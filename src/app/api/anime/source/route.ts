import { NextResponse } from "next/server";
import { AnimeProviderManager, normalizeProvider } from "@/lib/providers/AnimeProviderManager";
import { animeCache, cacheKey, TTL } from "@/lib/anime-cache";

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_ACCEPT = "*/*";
const DEFAULT_TIMEOUT_MS = 5000;

export async function GET(request: Request) {
    const startTime = Date.now();
    try {
        const { searchParams } = new URL(request.url);
        const rawId = searchParams.get("id");
        const rawEp = searchParams.get("ep");
        const rawMode = searchParams.get("mode") as 'sub' | 'dub' | 'raw' | null;
        const rawProvider = searchParams.get("provider");
        const serverId = searchParams.get("serverId") || undefined;
        const rawMalId = searchParams.get("malId");

        // STEP 1: VALIDATE & NORMALIZE INPUT
        if (!rawId || !rawEp) {
            return NextResponse.json(
                { 
                    success: false, 
                    embedUrl: "",
                    availableServers: [],
                    error: "Show ID and Episode Number are required", 
                    code: "INVALID_PARAMETERS",
                    sources: [], 
                    links: [] 
                }, 
                { status: 400 }
            );
        }

        const cleanId = rawId.trim();
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
            const primaryEmbedUrl = cachedSources[0]?.url || cachedSources[0]?.link || "";
            return NextResponse.json({
                success: true,
                cached: true,
                embedUrl: primaryEmbedUrl,
                availableServers: cachedSources,
                animeId: cleanId,
                episode: cleanEp,
                mode,
                count: cachedSources.length,
                sources: cachedSources,
                links: cachedSources
            });
        }

        // STEP 3: RESOLVE SOURCES WITH 5-SECOND TIMEOUT SAFEGUARD
        let resolution;
        try {
            resolution = await Promise.race([
                AnimeProviderManager.resolveSourcesWithDiagnostics(
                    cleanId,
                    cleanEp,
                    mode,
                    normalizedProvider,
                    serverId,
                    parsedMalId
                ),
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error("RESOLVER_TIMEOUT")), DEFAULT_TIMEOUT_MS)
                )
            ]);
        } catch (resolverErr: any) {
            console.warn(`[SourceRoute] ⚠️ Resolver warning for ${cleanId} ep ${cleanEp}:`, resolverErr?.message || resolverErr);
            // Fallback to empty sources resolution instead of throwing
            resolution = {
                sources: [],
                providerResults: [],
                resolvedBy: ["timeout-fallback"],
                tier: 4,
                errorSummary: resolverErr?.message || "Timeout/Partial Failure"
            };
        }

        // STEP 4: NORMALIZE & ENFORCE FALLBACK EMBED URLS
        const normalizedSources = (resolution.sources || []).map((s, idx) => {
            const rawUrl = s.url || (s as any).link || "";
            const isM3U8 = Boolean(s.isM3U8 || (s as any).hls || rawUrl.includes('.m3u8'));
            const isIframe = Boolean(s.isIframe || (!isM3U8 && rawUrl.length > 0));
            const type = isIframe ? 'iframe' : isM3U8 ? 'hls' : 'mp4';
            const quality = s.quality || (s as any).resolutionStr || 'Auto';
            const serverName = s.server || (s as any).provider || 'anime';
            const providerId = s.providerId || serverName;

            // Ensure upstream headers are populated if missing
            let refererHost = 'https://vidsrc.me';
            try {
                if (rawUrl) refererHost = new URL(rawUrl).origin;
            } catch (_) {}

            const headers = {
                'User-Agent': DEFAULT_USER_AGENT,
                'Accept': DEFAULT_ACCEPT,
                'Referer': refererHost,
                ...(s.headers || {})
            };

            return {
                id: `${serverName}-${idx}`,
                provider: serverName,
                providerId,
                url: rawUrl,
                type,
                quality,
                language: s.type || mode,
                subtitles: (s as any).subtitles || [],
                headers,
                isIframe,
                isM3U8,
                // Backwards-compatibility fields:
                link: rawUrl,
                hls: isM3U8,
                resolutionStr: quality
            };
        }).filter(s => Boolean(s.url)); // Keep remaining working sources

        const duration = Date.now() - startTime;
        const primaryEmbedUrl = normalizedSources[0]?.url || "";

        if (normalizedSources.length > 0) {
            // Cache successful response
            animeCache.set(cacheKeyStr, normalizedSources, TTL.SOURCES);
            console.log(`[SourceRoute] 🏁 [COMPLETE] Resolved ${normalizedSources.length} sources for ${cleanId} ep ${cleanEp} in ${duration}ms`);

            return NextResponse.json({
                success: true,
                cached: false,
                embedUrl: primaryEmbedUrl,
                availableServers: normalizedSources,
                animeId: cleanId,
                episode: cleanEp,
                mode,
                durationMs: duration,
                count: normalizedSources.length,
                resolvedBy: resolution.resolvedBy,
                tier: resolution.tier,
                sources: normalizedSources,
                links: normalizedSources,
            });
        }

        // ALL PROVIDERS FAILED OR TIMED OUT - Graceful empty response with valid JSON schema
        console.warn(`[SourceRoute] ❌ [NO_SOURCES] Failed to resolve sources for ${cleanId} ep ${cleanEp} after ${duration}ms`);

        return NextResponse.json({
            success: false,
            embedUrl: "",
            availableServers: [],
            error: `No playable sources found for episode ${cleanEp}`,
            code: "NO_SOURCES_AVAILABLE",
            animeId: cleanId,
            episode: cleanEp,
            mode,
            durationMs: duration,
            count: 0,
            sources: [],
            links: [],
        });
    } catch (err: any) {
        console.error("[SourceRoute] 💥 Unhandled route error:", err);
        return NextResponse.json({
            success: false,
            embedUrl: "",
            availableServers: [],
            error: "An unexpected error occurred while resolving streams.",
            code: "INTERNAL_SERVER_ERROR",
            sources: [],
            links: []
        }, { status: 500 });
    }
}

