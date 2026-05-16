import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 3600;

// Helper: wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string = ''): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms): ${label}`)), ms))
    ]);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const providerParam = searchParams.get("provider") as ProviderName;

    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const defaultProvider: ProviderName = "anikai";
    let provider = providerParam || defaultProvider;

    // 0. AUTO-DETECT PROVIDER FROM ID PREFIX
    if (id && id.includes(":")) {
        const [prefix] = id.split(":");
        const prefixMap: Record<string, ProviderName> = {
            'aw': 'aniwatch', 'hi': 'hianime', 'al': 'allanime',
            'on': 'onoflix', 'of': 'onoflix', 'wa': 'watchanimeworld',
            'ja': 'justanime', 'ax': 'animex', 'cb': 'cinebolt', 'un': 'cinebolt'
        };
        if (prefixMap[prefix]) provider = prefixMap[prefix];
    }

    try {
        // 1. SMART RESOLUTION (Numeric AniList/MAL IDs)
        if (id && /^\d+$/.test(id)) {
            console.log(`[Episodes] Numeric ID detected (${id}). Resolving...`);
            const media = await fetchAniListTitles(id);

            if (media) {
                // Limit titles to avoid too many searches
                const titles = [media.title.english, media.title.romaji].filter(Boolean).slice(0, 2);
                const searchProviders: ProviderName[] = ["hianime", "allanime", "aniwatch"];
                
                // Run all searches in parallel with a shared timeout
                const results = await Promise.allSettled(
                    searchProviders.flatMap(pName => 
                        titles.map(async (title) => {
                            const p = getProvider(pName);
                            const searchRes = await withTimeout(p.search(title), 5000, `search ${pName}:${title}`);
                            if (searchRes && searchRes.length > 0) {
                                const match = findBestMatch(searchRes, title);
                                const info = await withTimeout(p.getInfo(match.id), 5000, `info ${pName}:${match.id}`);
                                return { ...mapInfoToShow(info, media), provider: pName };
                            }
                            throw new Error("No match");
                        })
                    )
                );

                const successful = results
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value)
                    .map(r => r.value)
                    .sort((a, b) => (b.availableEpisodesDetail.sub.length + b.availableEpisodesDetail.dub.length) - 
                                   (a.availableEpisodesDetail.sub.length + a.availableEpisodesDetail.dub.length));

                if (successful.length > 0) {
                    return NextResponse.json({ show: successful[0] });
                }
            }
        }

        // 2. STANDARD LOOKUP (Direct ID)
        try {
            const animeProvider = getProvider(provider);
            const info = await withTimeout(animeProvider.getInfo(id), 6000, `getInfo ${provider}:${id}`);
            const mappedInfo = mapInfoToShow(info);
            if (mappedInfo && (mappedInfo.availableEpisodesDetail.sub.length > 0 || mappedInfo.availableEpisodesDetail.dub.length > 0)) {
                return NextResponse.json({ show: { ...mappedInfo, provider } });
            }
        } catch (e: any) {
            console.warn(`[Episodes] Direct lookup failed for ${provider}: ${e.message}`);
        }

        // 3. FALLBACK CHAIN
        const fallbacks: ProviderName[] = ["hianime", "allanime", "aniwatch"];
        const fallbackResults = await Promise.allSettled(
            fallbacks.filter(f => f !== provider).map(async (fb) => {
                const p = getProvider(fb);
                const info = await withTimeout(p.getInfo(id), 5000, `fallback getInfo ${fb}:${id}`);
                return { ...mapInfoToShow(info), provider: fb };
            })
        );
        
        const bestFallback = fallbackResults
            .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value)
            .map(r => r.value)
            .find(v => v.availableEpisodesDetail.sub.length > 0 || v.availableEpisodesDetail.dub.length > 0);

        if (bestFallback) return NextResponse.json({ show: bestFallback });

        return NextResponse.json({ error: "Anime not found" }, { status: 404 });

    } catch (error: any) {
        console.error(`[Episodes] Critical error: ${error.message}`);
        return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }
}


// Helpers
const findBestMatch = (results: any[], target: string) => {
    if (!results || results.length === 0) return null;
    const exact = results.find(r => r.title.toLowerCase() === target.toLowerCase());
    if (exact) return exact;
    return results[0];
};

async function fetchAniListTitles(id: string) {
    try {
        const query = `query ($id: Int) { Media (id: $id, type: ANIME) { title { romaji english native } synonyms } }`;
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id: parseInt(id) } })
        });
        const data = await res.json();
        return data?.data?.Media;
    } catch (e) {
        return null;
    }
}

function mapInfoToShow(info: any, aniListData?: any) {
    if (!info) return null;
    const episodes = info.episodes || [];
    const subEps = info.availableEpisodesDetail?.sub || (Array.isArray(episodes) ? episodes.map((ep: any) => ep?.number?.toString()) : []);
    const dubEps = info.availableEpisodesDetail?.dub || [];

    return {
        _id: info.id || "unknown",
        name: info.title || aniListData?.title?.english || aniListData?.title?.romaji || "Unknown",
        englishName: aniListData?.title?.english || null,
        romajiName: aniListData?.title?.romaji || null,
        thumbnail: info.image,
        anilistId: info.anilistId || info.aniListId || null,
        malId: info.malId || null,
        tmdbId: info.tmdbId || null,
        availableEpisodesDetail: {
            sub: subEps.filter(Boolean),
            dub: dubEps.filter(Boolean)
        }
    };
}
