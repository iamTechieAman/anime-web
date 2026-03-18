export const runtime = "edge";
import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const providerParam = searchParams.get("provider") as ProviderName;

    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const defaultProvider: ProviderName = "anikai";
    let provider = providerParam || defaultProvider;

    // 0. AUTO-DETECT PROVIDER FROM ID PREFIX (e.g., "on:123" -> onoflix)
    if (id && id.includes(":")) {
        const [prefix] = id.split(":");
        const prefixMap: Record<string, ProviderName> = {
            'aw': 'aniwatch',
            'hi': 'hianime',
            'al': 'allanime',
            'on': 'onoflix',
            'wa': 'watchanimeworld',
            'ja': 'justanime',
            'ax': 'animex',
            'cb': 'cinebolt',
            'un': 'cinebolt' // Default for universal IDs
        };
        if (prefixMap[prefix]) {
            provider = prefixMap[prefix];
            console.log(`[Episodes] Auto-detected provider: ${provider} from ID prefix: ${prefix}`);
        }
    }

    try {
        console.log(`[Episodes] Request: ID=${id}, Provider=${provider}`);

        // 1. SMART RESOLUTION (Numeric AniList/MAL IDs)
        if (id && /^\d+$/.test(id)) {
            console.log(`[Episodes] Numeric ID detected (${id}). Attempting smart resolution...`);
            const media = await fetchAniListTitles(id);

            if (media) {
                const titles = [media.title.english, media.title.romaji, ...(media.synonyms || [])].filter(Boolean);
                console.log(`[Episodes] Searching for titles: ${JSON.stringify(titles)}`);
                
                // We'll try to find matches on these providers
                const searchProviders: ProviderName[] = ["allanime", "hianime", "aniwatch"];
                let bestShow: any = null;
                let maxEps = -1;

                for (const searchP of searchProviders) {
                    try {
                        const p = getProvider(searchP);
                        for (const title of titles) {
                            console.log(`[Episodes] Searching "${title}" on ${searchP}...`);
                            const results = await p.search(title);
                            if (results && results.length > 0) {
                                // Find best match or take first
                                const match = findBestMatch(results, title);
                                if (match) {
                                    console.log(`[Episodes] Potential match found on ${searchP}: ${match.title} (${match.id})`);
                                    const info = await p.getInfo(match.id);
                                    const show = mapInfoToShow(info, media);
                                    const total = (show?.availableEpisodesDetail.sub.length || 0) + (show?.availableEpisodesDetail.dub.length || 0);
                                    
                                    if (show && total > maxEps) {
                                        maxEps = total;
                                        bestShow = { ...show, provider: searchP };
                                        console.log(`[Episodes] New best show from ${searchP} with ${total} episodes.`);
                                    }
                                }
                            }
                        }
                    } catch (e: any) {
                        console.warn(`[Episodes] Search failed on ${searchP}: ${e.message}`);
                    }
                }

                if (bestShow) {
                    return NextResponse.json({ show: bestShow });
                }
            }
        }

        // 2. STANDARD LOOKUP (Direct ID)
        try {
            const animeProvider = getProvider(provider);
            const info = await animeProvider.getInfo(id);
            const mappedInfo = mapInfoToShow(info);

            if (mappedInfo && (mappedInfo.availableEpisodesDetail.sub.length > 0 || mappedInfo.availableEpisodesDetail.dub.length > 0)) {
                return NextResponse.json({
                    show: { ...mappedInfo, provider }
                });
            }
        } catch (e: any) {
            console.warn(`[Episodes] Direct lookup failed for ${provider}: ${e.message}`);
        }

        // 3. FALLBACK CHAIN (Retry ID on other providers)
        const fallbacks: ProviderName[] = ["allanime", "hianime", "aniwatch", "anikai"];
        for (const fb of fallbacks) {
            if (fb === provider) continue;
            try {
                console.log(`[Episodes] Trying fallback ID lookup: ${fb}`);
                const p = getProvider(fb);
                const info = await p.getInfo(id);
                const show = mapInfoToShow(info);
                if (show && (show.availableEpisodesDetail.sub.length > 0 || show.availableEpisodesDetail.dub.length > 0)) {
                    return NextResponse.json({
                        show: { ...show, provider: fb }
                    });
                }
            } catch (e: any) { /* silent */ }
        }

        // 4. LAST RESORT: Title Search resolution if we have a way to get title
        // (This handles cases where a slug ID was provided but it only works on one provider)
        // We'll only do this if it's NOT a numeric ID (since we already did numeric resolution above)
        if (!/^\d+$/.test(id)) {
             try {
                 // Try to guess title from slug-id (e.g. "jujutsu-kaisen-tv" -> "jujutsu kaisen")
                 const guessedTitle = id.split("-").join(" ").replace(/\(.*\)/, "").trim();
                 console.log(`[Episodes] ID lookup failed. Trying guessed title search: "${guessedTitle}"`);
                 
                  const searchResProviders: ProviderName[] = ["allanime", "hianime", "aniwatch"];
                  for (const searchP of searchResProviders) {
                      try {
                          console.log(`[Episodes] Trying guessed title search on ${searchP}: "${guessedTitle}"`);
                          const p = getProvider(searchP);
                          const results = await p.search(guessedTitle);
                          if (results && results.length > 0) {
                              const match = findBestMatch(results, guessedTitle);
                              const info = await p.getInfo(match.id);
                              const show = mapInfoToShow(info);
                              if (show && (show.availableEpisodesDetail.sub.length > 0 || show.availableEpisodesDetail.dub.length > 0)) {
                                  return NextResponse.json({
                                      show: { ...show, provider: searchP }
                                  });
                              }
                          }
                      } catch (e) { /* silent */ }
                  }
             } catch (e) { }
        }

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
        availableEpisodesDetail: {
            sub: subEps.filter(Boolean),
            dub: dubEps.filter(Boolean)
        }
    };
}
