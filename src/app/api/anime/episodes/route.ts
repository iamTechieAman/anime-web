import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";
import { animeCache, cacheKey, TTL } from "@/lib/anime-cache";

export const revalidate = 1800; // 30 min ISR

// Helper: wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label = ''): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout (${ms}ms): ${label}`)), ms)
        ),
    ]);
}

// Provider search order — stable providers first
const SEARCH_PROVIDERS: ProviderName[] = ['allanime', 'hianime', 'anikai', 'aniwatch'];

// ID prefix → provider mapping
const PREFIX_MAP: Record<string, ProviderName> = {
    'aw': 'aniwatch', 'hi': 'hianime', 'al': 'allanime',
    'on': 'onoflix', 'of': 'onoflix', 'wa': 'watchanimeworld',
    'ja': 'justanime', 'ax': 'animex', 'cb': 'cinebolt', 'un': 'cinebolt', 'wv': 'aniwave',
};

const findBestMatch = (results: any[], target: string) => {
    if (!results?.length) return null;
    const exact = results.find(r => r.title?.toLowerCase() === target.toLowerCase());
    if (exact) return exact;
    const partial = results.find(r =>
        r.title?.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(r.title?.toLowerCase())
    );
    return partial || results[0];
};

function mapInfoToShow(info: any, aniListData?: any) {
    if (!info) return null;
    const episodes = info.episodes || [];
    const subEps = info.availableEpisodesDetail?.sub ||
        (Array.isArray(episodes) ? episodes.map((ep: any) => ep?.number?.toString()) : []);
    const dubEps = info.availableEpisodesDetail?.dub || [];

    return {
        _id: info.id || 'unknown',
        name: info.title || aniListData?.title?.english || aniListData?.title?.romaji || 'Unknown',
        englishName: aniListData?.title?.english || null,
        romajiName: aniListData?.title?.romaji || null,
        thumbnail: info.image,
        anilistId: info.anilistId || info.aniListId || null,
        malId: info.malId || null,
        tmdbId: info.tmdbId || null,
        availableEpisodesDetail: {
            sub: subEps.filter(Boolean),
            dub: dubEps.filter(Boolean),
        },
    };
}

async function fetchAniListTitles(id: string) {
    const cached = animeCache.get<any>(cacheKey.anilist(id));
    if (cached) return cached;

    try {
        const query = `query ($id: Int) { Media (id: $id, type: ANIME) { title { romaji english native } synonyms } }`;
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id: parseInt(id) } }),
            signal: AbortSignal.timeout(6000),
        });
        const data = await res.json();
        const media = data?.data?.Media;
        if (media) {
            animeCache.set(cacheKey.anilist(id), media, TTL.ANILIST_META);
        }
        return media;
    } catch (e) {
        console.warn(`[Episodes] AniList fetch failed for ${id}:`, e);
        return null;
    }
}

async function fetchJikanEpisodeCount(malId: string): Promise<string[]> {
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        const total = data?.data?.episodes;
        if (total && total > 0) {
            return Array.from({ length: total }, (_, i) => String(i + 1));
        }
    } catch (_) {}
    return [];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const providerParam = searchParams.get("provider") as ProviderName | null;

    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Detect provider from ID prefix
    let provider: ProviderName = providerParam || 'allanime';
    if (id.includes(':')) {
        const prefix = id.split(':')[0];
        if (PREFIX_MAP[prefix]) provider = PREFIX_MAP[prefix];
    }

    // Check episode list cache
    const epCacheKey = cacheKey.episodes(id, provider);
    const cachedEpisodes = animeCache.get<any>(epCacheKey);
    if (cachedEpisodes) {
        console.log(`[Episodes] ✓ Cache hit: ${id} via ${provider}`);
        return NextResponse.json({ show: cachedEpisodes, fromCache: true });
    }

    try {
        // ─── PATH 1: Numeric AniList/MAL ID ─────────────────────────────────
        if (/^\d+$/.test(id)) {
            console.log(`[Episodes] Numeric ID (${id}) — resolving via AniList...`);
            const media = await fetchAniListTitles(id);

            if (media) {
                const titles = [media.title.english, media.title.romaji]
                    .filter(Boolean)
                    .slice(0, 2) as string[];

                // Race searches across providers × titles
                const searchTasks = SEARCH_PROVIDERS.flatMap(pName =>
                    titles.map(async (title) => {
                        const p = getProvider(pName);
                        const searchRes = await withTimeout(p.search(title), 5000, `search ${pName}`);
                        if (!searchRes?.length) throw new Error('No results');
                        const match = findBestMatch(searchRes, title);
                        if (!match) throw new Error('No match');
                        const info = await withTimeout(p.getInfo(match.id), 5000, `info ${pName}:${match.id}`);
                        return { ...mapInfoToShow(info, media), provider: pName };
                    })
                );

                const results = await Promise.allSettled(searchTasks);
                const successful = results
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
                    .map(r => r.value)
                    .sort((a, b) =>
                        (b.availableEpisodesDetail.sub.length + b.availableEpisodesDetail.dub.length) -
                        (a.availableEpisodesDetail.sub.length + a.availableEpisodesDetail.dub.length)
                    );

                if (successful.length > 0) {
                    const best = successful[0];
                    animeCache.set(cacheKey.episodes(id, best.provider), best, TTL.EPISODE_LIST);
                    return NextResponse.json({ show: best });
                }

                // ─── Jikan fallback for episode count ───────────────────────
                console.log(`[Episodes] Provider search failed for ${id}, trying Jikan...`);
                const jikanEps = await fetchJikanEpisodeCount(id);
                if (jikanEps.length > 0) {
                    const jikanShow = {
                        _id: id,
                        name: media.title.english || media.title.romaji || 'Unknown',
                        englishName: media.title.english || null,
                        romajiName: media.title.romaji || null,
                        thumbnail: null,
                        anilistId: parseInt(id),
                        malId: parseInt(id),
                        availableEpisodesDetail: { sub: jikanEps, dub: [] },
                        provider: 'jikan',
                    };
                    animeCache.set(cacheKey.episodes(id, 'jikan'), jikanShow, TTL.EPISODE_LIST);
                    return NextResponse.json({ show: jikanShow });
                }
            }
        }

        // ─── PATH 2: Direct provider ID lookup ──────────────────────────────
        try {
            const p = getProvider(provider);
            const info = await withTimeout(p.getInfo(id), 6000, `getInfo ${provider}`);
            const mapped = mapInfoToShow(info);
            if (mapped && (mapped.availableEpisodesDetail.sub.length > 0 || mapped.availableEpisodesDetail.dub.length > 0)) {
                const result = { ...mapped, provider };
                animeCache.set(epCacheKey, result, TTL.EPISODE_LIST);
                return NextResponse.json({ show: result });
            }
        } catch (e: any) {
            console.warn(`[Episodes] Direct lookup failed (${provider}): ${e.message}`);
        }

        // ─── PATH 3: Fallback chain ──────────────────────────────────────────
        const fallbacks = SEARCH_PROVIDERS.filter(f => f !== provider);
        const fallbackResults = await Promise.allSettled(
            fallbacks.map(async (fb) => {
                const p = getProvider(fb);
                const info = await withTimeout(p.getInfo(id), 5000, `fallback ${fb}`);
                return { ...mapInfoToShow(info), provider: fb };
            })
        );

        const bestFallback = fallbackResults
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
            .map(r => r.value)
            .find(v => v.availableEpisodesDetail.sub.length > 0 || v.availableEpisodesDetail.dub.length > 0);

        if (bestFallback) {
            animeCache.set(cacheKey.episodes(id, bestFallback.provider), bestFallback, TTL.EPISODE_LIST);
            return NextResponse.json({ show: bestFallback });
        }

        return NextResponse.json({ error: "Anime not found on any provider" }, { status: 404 });

    } catch (error: any) {
        console.error(`[Episodes] Critical error: ${error.message}`);
        return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }
}
