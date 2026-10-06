import { NextResponse } from "next/server";
import { AnimeProviderManager, normalizeProvider } from "@/lib/providers/AnimeProviderManager";

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_ACCEPT = "*/*";
const DEFAULT_TIMEOUT_MS = 5000;

export async function GET(request: Request) {
    const startTime = Date.now();
    try {
        const { searchParams } = new URL(request.url);
        const rawId = searchParams.get("id") || searchParams.get("animeId");
        const rawEp = searchParams.get("ep") || searchParams.get("episode") || "1";
        const rawMode = searchParams.get("mode") as 'sub' | 'dub' | 'raw' | null;
        const rawProvider = searchParams.get("provider");
        const serverId = searchParams.get("serverId") || undefined;
        const rawEmbedUrl = searchParams.get("embedUrl") || searchParams.get("url");

        // If direct embed URL is provided, return it immediately as raw embed fallback
        if (rawEmbedUrl) {
            return NextResponse.json({
                success: true,
                embedUrl: rawEmbedUrl,
                availableServers: [{ id: 'direct', name: 'Direct Embed', url: rawEmbedUrl, isIframe: true }],
                sources: [{ url: rawEmbedUrl, isIframe: true, quality: 'Auto' }]
            });
        }

        if (!rawId) {
            return NextResponse.json({
                success: false,
                embedUrl: "",
                availableServers: [],
                error: "Parameter 'id' is required",
                code: "INVALID_PARAMETERS"
            }, { status: 400 });
        }

        const cleanId = rawId.trim();
        const cleanEp = rawEp.trim();
        const mode = rawMode && ['sub', 'dub', 'raw'].includes(rawMode) ? rawMode : 'sub';
        const normalizedProvider = rawProvider ? normalizeProvider(rawProvider) : undefined;

        let resolution: any;
        try {
            resolution = await Promise.race([
                AnimeProviderManager.resolveSourcesWithDiagnostics(
                    cleanId,
                    cleanEp,
                    mode,
                    normalizedProvider,
                    serverId
                ),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("RESOLVER_TIMEOUT")), DEFAULT_TIMEOUT_MS)
                )
            ]);
        } catch (resolverErr: any) {
            console.warn(`[StreamRoute] Resolver error/timeout for ${cleanId} ep ${cleanEp}:`, resolverErr?.message || resolverErr);
            // Fallback directly to RAW embed URL generator if extraction fails or times out
            const fallbackEmbedUrl = `https://vidsrc.me/embed/anime?anilist=${encodeURIComponent(cleanId)}&episode=${encodeURIComponent(cleanEp)}`;
            return NextResponse.json({
                success: true,
                fallback: true,
                embedUrl: fallbackEmbedUrl,
                availableServers: [{
                    id: 'fallback-vidsrc',
                    name: 'VidSrc Direct Embed',
                    url: fallbackEmbedUrl,
                    isIframe: true,
                    headers: {
                        'User-Agent': DEFAULT_USER_AGENT,
                        'Accept': DEFAULT_ACCEPT
                    }
                }],
                sources: [{ url: fallbackEmbedUrl, isIframe: true, quality: 'Auto' }]
            });
        }

        const normalizedSources = (resolution?.sources || []).map((s: any, idx: number) => {
            const rawUrl = s.url || s.link || "";
            const isM3U8 = Boolean(s.isM3U8 || s.hls || rawUrl.includes('.m3u8'));
            const isIframe = Boolean(s.isIframe || (!isM3U8 && rawUrl.length > 0));

            let refererHost = 'https://vidsrc.me';
            try {
                if (rawUrl) refererHost = new URL(rawUrl).origin;
            } catch (_) {}

            return {
                id: s.id || `server-${idx}`,
                name: s.server || s.provider || 'Stream Server',
                url: rawUrl,
                type: isIframe ? 'iframe' : isM3U8 ? 'hls' : 'mp4',
                quality: s.quality || 'Auto',
                isIframe,
                isM3U8,
                headers: {
                    'User-Agent': DEFAULT_USER_AGENT,
                    'Accept': DEFAULT_ACCEPT,
                    'Referer': refererHost,
                    ...(s.headers || {})
                }
            };
        }).filter((s: any) => Boolean(s.url));

        if (normalizedSources.length > 0) {
            return NextResponse.json({
                success: true,
                embedUrl: normalizedSources[0].url,
                availableServers: normalizedSources,
                sources: normalizedSources,
                durationMs: Date.now() - startTime
            });
        }

        // Scraper could not extract direct MP4/M3U8 links -> fall back directly to RAW embed URL
        const fallbackEmbedUrl = `https://vidsrc.me/embed/anime?anilist=${encodeURIComponent(cleanId)}&episode=${encodeURIComponent(cleanEp)}`;
        return NextResponse.json({
            success: true,
            fallback: true,
            embedUrl: fallbackEmbedUrl,
            availableServers: [{
                id: 'fallback-raw-embed',
                name: 'RAW Embed Server',
                url: fallbackEmbedUrl,
                isIframe: true,
                headers: {
                    'User-Agent': DEFAULT_USER_AGENT,
                    'Accept': DEFAULT_ACCEPT
                }
            }],
            sources: [{ url: fallbackEmbedUrl, isIframe: true, quality: 'Auto' }]
        });

    } catch (err: any) {
        console.error("[StreamRoute] Unhandled error:", err);
        return NextResponse.json({
            success: false,
            embedUrl: "",
            availableServers: [],
            error: "Failed to resolve stream source",
            code: "INTERNAL_SERVER_ERROR"
        }, { status: 500 });
    }
}
