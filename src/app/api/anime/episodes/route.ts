import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";
import { animeCache, cacheKey, TTL } from "@/lib/anime-cache";
import { providerHealth } from "@/lib/provider-health";

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

// Provider search order — stable providers first (limit to 2 to avoid 504s)
const SEARCH_PROVIDERS: ProviderName[] = ['allanime', 'aniwatch'];

// ID prefix → provider mapping
const PREFIX_MAP: Record<string, ProviderName> = {
    'aw': 'aniwatch', 'hi': 'hianime', 'al': 'allanime',
    'wv': 'aniwave', 'awt': 'aniwatchtv',
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
        const healthyProviders = providerHealth.getHealthyProviders(SEARCH_PROVIDERS);
        const providersToSearch = healthyProviders.length > 0 ? healthyProviders : SEARCH_PROVIDERS;

        // ─── PATH 1: Numeric AniList/MAL ID ─────────────────────────────────
        if (/^\d+$/.test(id)) {
            console.log(`[Episodes] Numeric ID (${id}) — resolving via AniList...`);
            const media = await fetchAniListTitles(id);

            if (media) {
                const titles = [media.title.english, media.title.romaji]
                    .filter(Boolean)
                    .slice(0, 2) as string[];

                // Race searches across providers × titles using Promise.any for first-to-respond
                const searchTasks = providersToSearch.flatMap(pName =>
                    titles.map(async (title) => {
                        try {
                            const p = getProvider(pName);
                            const searchRes = await withTimeout(p.search(title), 5000, `search ${pName}`);
                            if (!searchRes?.length) throw new Error('No results');
                            
                            // To prevent mismatching series with similar names (e.g. Doraemon 1979 vs 2005),
                            // we fetch info for the top 3 results and match their AniList ID exactly.
                            const topResults = searchRes.slice(0, 3);
                            
                            const infoPromises = topResults.map(r => 
                                withTimeout(p.getInfo(r.id), 5000, `info ${pName}:${r.id}`).catch(() => null)
                            );
                            
                            const infos = await Promise.all(infoPromises);
                            
                            // Find strict ID match first, fallback to best title match if provider missing IDs
                            let matchInfo = infos.find(info => 
                                info && (String(info.anilistId) === id || String((info as any).aniListId) === id || String(info.malId) === String(media.idMal))
                            );
                            
                            if (!matchInfo) {
                                const titleMatch = findBestMatch(searchRes, title);
                                if (!titleMatch) throw new Error('No match');
                                matchInfo = infos[topResults.findIndex(r => r.id === titleMatch.id)] 
                                            || await withTimeout(p.getInfo(titleMatch.id), 5000, `info fallback ${pName}`);
                            }

                            if (!matchInfo) throw new Error('Info fetch failed');

                            const mapped = mapInfoToShow(matchInfo, media);
                            if (!mapped || (mapped.availableEpisodesDetail.sub.length === 0 && mapped.availableEpisodesDetail.dub.length === 0)) {
                                throw new Error('No episodes found');
                            }
                            providerHealth.reportSuccess(pName);
                            return { ...mapped, provider: pName };
                        } catch (err: any) {
                            if (err?.message?.includes('Timeout')) {
                                providerHealth.reportError(pName, true);
                            } else {
                                providerHealth.reportError(pName, false);
                            }
                            throw err; // Re-throw so Promise.any moves to the next
                        }
                    })
                );

                try {
                    // Add 10s overall deadline to prevent Vercel 504
                    const deadline = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Overall deadline')), 10000));
                    const best = await Promise.race([Promise.any(searchTasks), deadline]);
                    animeCache.set(cacheKey.episodes(id, best.provider), best, TTL.EPISODE_LIST);
                    return NextResponse.json({ show: best });
                } catch (aggregateErr) {
                    console.log(`[Episodes] Provider search failed across all providers for ${id}`);
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
                providerHealth.reportSuccess(provider);
                const result = { ...mapped, provider };
                animeCache.set(epCacheKey, result, TTL.EPISODE_LIST);
                return NextResponse.json({ show: result });
            }
        } catch (e: any) {
            console.warn(`[Episodes] Direct lookup failed (${provider}): ${e.message}`);
            if (e.message.includes('Timeout')) providerHealth.reportError(provider, true);
        }

        // ─── PATH 3: Fallback chain ──────────────────────────────────────────
        const fallbacks = providersToSearch.filter(f => f !== provider);
        const fallbackTasks = fallbacks.map(async (fb) => {
            try {
                const p = getProvider(fb);
                const info = await withTimeout(p.getInfo(id), 5000, `fallback ${fb}`);
                const mapped = mapInfoToShow(info);
                if (!mapped || (mapped.availableEpisodesDetail.sub.length === 0 && mapped.availableEpisodesDetail.dub.length === 0)) {
                    throw new Error('No episodes found');
                }
                providerHealth.reportSuccess(fb);
                return { ...mapped, provider: fb };
            } catch (err: any) {
                if (err.message.includes('Timeout')) providerHealth.reportError(fb, true);
                throw err;
            }
        });

        try {
            const bestFallback = await Promise.any(fallbackTasks);
            animeCache.set(cacheKey.episodes(id, bestFallback.provider), bestFallback, TTL.EPISODE_LIST);
            return NextResponse.json({ show: bestFallback });
        } catch (aggregateErr) {
            console.warn(`[Episodes] All fallbacks failed for ${id}`);
        }

        return NextResponse.json({ error: "Anime not found on any provider" }, { status: 404 });

    } catch (error: any) {
        console.error(`[Episodes] Critical error: ${error.message}`);
        return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }
}
