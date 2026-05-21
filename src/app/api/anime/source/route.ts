import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";
import { animeCache, cacheKey, TTL } from "@/lib/anime-cache";

// Helper: wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label = ''): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout (${ms}ms): ${label}`)), ms)
        ),
    ]);
}

/** Proxy HLS m3u8 URLs through /api/proxy for CORS bypass */
function proxyUrl(url: string, referer?: string): string {
    if (!url || !url.startsWith('http')) return url;
    const base = `/api/proxy?url=${encodeURIComponent(url)}`;
    return referer ? `${base}&referer=${encodeURIComponent(referer)}` : base;
}

/** Determine Referer header for a given CDN URL */
function getRefererForSource(url: string, provider: string): string {
    const REFERER_MAP: Record<string, string> = {
        'gogocdn.net': 'https://gogoanime.hu',
        'playtaku.net': 'https://gogoanime.hu',
        'vidstreaming.io': 'https://gogoanime.hu',
        'megacloud.tv': 'https://hianime.to',
        'rapid-cloud.co': 'https://hianime.to',
        'rabbitstream.net': 'https://zoro.to',
        'allanime.day': 'https://allmanga.to',
        'youtube-anime.com': 'https://allmanga.to',
    };
    try {
        const host = new URL(url).hostname;
        for (const [domain, ref] of Object.entries(REFERER_MAP)) {
            if (host.includes(domain)) return ref;
        }
    } catch (_) {}
    // Fallback by provider
    if (provider === 'hianime') return 'https://hianime.to';
    if (provider === 'allanime') return 'https://allmanga.to';
    return 'https://gogoanime.hu';
}

/** Transform raw VideoSource into frontend-compatible link */
function buildLink(s: any, provider: string) {
    const referer = getRefererForSource(s.url, provider);

    // Always proxy HLS streams and any URL needing CORS bypass
    const needsProxy = s.isM3U8 ||
        s.url.includes('.m3u8') ||
        s.url.includes('gogocdn') ||
        s.url.includes('megacloud') ||
        s.url.includes('rapid-cloud') ||
        s.url.includes('rabbitstream') ||
        s.url.includes('allanime.day') ||
        s.url.includes('youtube-anime');

    const finalUrl = needsProxy ? proxyUrl(s.url, referer) : s.url;

    return {
        link: finalUrl,
        hls: s.isM3U8 || s.url.includes('.m3u8'),
        resolutionStr: s.quality || 'auto',
        isIframe: s.isIframe || false,
        provider,
        fromCache: new Date().toISOString(),
    };
}

// Provider priority order for sources — most reliable first
const PRIMARY_PROVIDERS: ProviderName[] = ['allanime', 'hianime', 'anikai', 'aniwatch'];
const FALLBACK_PROVIDERS: ProviderName[] = ['consumet', 'aniwave', 'vidsrc'];

// Auto-detect provider from ID prefix
const PREFIX_MAP: Record<string, ProviderName> = {
    'aw': 'aniwatch', 'hi': 'hianime', 'al': 'allanime',
    'on': 'onoflix', 'of': 'onoflix', 'wa': 'watchanimeworld',
    'ja': 'justanime', 'ax': 'animex', 'cb': 'cinebolt', 'un': 'cinebolt', 'wv': 'aniwave',
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get("id");
    const episodeString = searchParams.get("ep");
    const mode = (searchParams.get("mode") || "sub") as "sub" | "dub" | "raw";
    const serverId = searchParams.get("serverId") || undefined;
    const providerParam = searchParams.get("provider") as ProviderName | null;

    if (!showId || !episodeString) {
        return NextResponse.json(
            { error: "Show ID and Episode Number are required" },
            { status: 400 }
        );
    }

    // Check cache first
    const cached = animeCache.get<any[]>(cacheKey.sources(showId, episodeString, mode));
    if (cached) {
        console.log(`[SourceAPI] ✓ Cache hit: ${showId} ep ${episodeString}`);
        return NextResponse.json({ links: cached, fromCache: true });
    }

    // Detect provider from ID prefix
    let detectedProvider: ProviderName | null = null;
    if (showId.includes(':')) {
        const prefix = showId.split(':')[0];
        if (PREFIX_MAP[prefix]) detectedProvider = PREFIX_MAP[prefix];
    }

    // Build ordered provider list: explicit > detected > primary chain > fallback chain
    const orderedProviders: ProviderName[] = [];
    if (providerParam && !orderedProviders.includes(providerParam)) orderedProviders.push(providerParam);
    if (detectedProvider && !orderedProviders.includes(detectedProvider)) orderedProviders.push(detectedProvider);
    for (const p of PRIMARY_PROVIDERS) if (!orderedProviders.includes(p)) orderedProviders.push(p);
    for (const p of FALLBACK_PROVIDERS) if (!orderedProviders.includes(p)) orderedProviders.push(p);

    console.log(`[SourceAPI] ID=${showId}, Ep=${episodeString}, Mode=${mode} | Chain: ${orderedProviders.slice(0, 4).join(' → ')}`);

    // ─── STRATEGY: Race top 3 providers in parallel, take first winner ───────
    const [first, ...rest] = orderedProviders;

    // Attempt to get sources from a single provider
    async function tryProvider(name: ProviderName): Promise<{ links: any[]; provider: string }> {
        const p = getProvider(name);
        const sources = await withTimeout(
            p.getSources(showId!, episodeString!, mode, serverId),
            8000,
            `getSources ${name}`
        );
        if (!sources || sources.length === 0) throw new Error(`No sources from ${name}`);
        const links = sources.map(s => buildLink(s, name));
        return { links, provider: name };
    }

    // Race top 3 providers
    const raceProviders = orderedProviders.slice(0, 3);
    let result: { links: any[]; provider: string } | null = null;

    try {
        result = await Promise.any(raceProviders.map(name => tryProvider(name)));
        console.log(`[SourceAPI] ✓ Race winner: ${result.provider}`);
    } catch (_raceErr) {
        // All top-3 failed — try remaining providers sequentially
        console.log(`[SourceAPI] Race failed, trying sequential fallbacks...`);
        for (const providerName of orderedProviders.slice(3)) {
            try {
                result = await tryProvider(providerName);
                console.log(`[SourceAPI] ✓ Sequential fallback winner: ${result.provider}`);
                break;
            } catch (e: any) {
                console.warn(`[SourceAPI] ${providerName} failed: ${e.message}`);
            }
        }
    }

    if (result && result.links.length > 0) {
        // Cache the result
        animeCache.set(cacheKey.sources(showId, episodeString, mode), result.links, TTL.SOURCES);
        return NextResponse.json({ links: result.links, provider: result.provider });
    }

    return NextResponse.json(
        {
            error: "This show is currently unavailable on all sources.",
            suggestion: "Try switching between Sub and Dub, or check back later.",
        },
        { status: 404 }
    );
}
