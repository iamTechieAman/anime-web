import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 0; // Ensure fresh data for real-time updates

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const providerParam = searchParams.get("provider") as ProviderName;

    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Default provider logic
    // Even if Anikai is default, if we detect numeric ID, we switch to Smart Resolution
    const defaultProvider = "anikai";
    const provider = providerParam || defaultProvider;

    try {
        console.log(`[Episodes] Request for ID: ${id} (Provider: ${provider})`);

        // ==========================================
        // SMART RESOLUTION (AniList/MAL Numeric IDs)
        // ==========================================
        if (/^\d+$/.test(id)) {
            try {
                console.log(`[Episodes] Numeric ID detected (${id}). Attempting smart resolution...`);
                // fetchAniListTitles returns an array of possible titles (English, Romaji, Synonyms)
                const titles = await fetchAniListTitles(id);

                if (titles && titles.length > 0) {
                    console.log(`[Episodes] Resolved Titles to try: ${JSON.stringify(titles)}. Searching on providers...`);

                    const allAnime = getProvider("allanime");
                    const hiAnime = getProvider("hianime");
                    let bestMatch = null;
                    let usedProviderName = "";

                    // Helper to prevent taking an OVA/Movie when searching for the main series
                    const findBestMatch = (results: any[], targetTitle: string) => {
                        if (!results || results.length === 0) return null;
                        const exact = results.find(r => r.title.toLowerCase() === targetTitle.toLowerCase());
                        if (exact) return exact;

                        const startsWith = results.find(r => r.title.toLowerCase().startsWith(targetTitle.toLowerCase()));
                        return startsWith || results[0];
                    };

                    // Iterate through all potential titles to find the first exact/good match
                    for (const title of titles) {
                        if (!title) continue;
                        console.log(`[Episodes] Trying title variation: "${title}"`);

                        let searchResults = await allAnime.search(title);
                        if (searchResults.length > 0) {
                            bestMatch = findBestMatch(searchResults, title);
                            usedProviderName = bestMatch.id.length > 15 ? "allanime" : "hianime";
                            break; // Stop searching once we find a solid match
                        }

                        // Fallback to HiAnime with the same title variation
                        searchResults = await hiAnime.search(title);
                        if (searchResults.length > 0) {
                            bestMatch = findBestMatch(searchResults, title);
                            usedProviderName = bestMatch.id.length > 15 ? "allanime" : "hianime";
                            break;
                        }
                    }

                    if (bestMatch) {
                        console.log(`[Episodes] Found match: ${bestMatch.title} (${bestMatch.id}) using ${usedProviderName}. Fetching info...`);

                        const infoProvider = getProvider(usedProviderName as any);
                        const info = await infoProvider.getInfo(bestMatch.id);
                        return NextResponse.json({
                            show: mapInfoToShow(info)
                        });
                    } else {
                        console.warn(`[Episodes] No search results found for any title variations on any provider.`);
                        return NextResponse.json({ error: "Anime not found in database" }, { status: 404 });
                    }
                } else {
                    console.warn(`[Episodes] Could not resolve title for AniList ID: ${id}`);
                }
            } catch (resolveError: any) {
                console.error(`[Episodes] Smart resolution error:`, resolveError);
                // Continue to standard fallback if resolution crashed
            }
        }

        // ==========================================
        // STANDARD PROVIDER LOGIC (String IDs)
        // ==========================================
        const animeProvider = getProvider(provider);
        const info = await animeProvider.getInfo(id);
        return NextResponse.json({
            show: {
                ...mapInfoToShow(info),
                provider // Ensure the provider used is returned
            }
        });

    } catch (error: any) {
        console.error(`[Episodes] Provider ${provider} failed:`, error.message);

        // Fallback Chain: Anikai -> AllAnime -> HiAnime (for non-numeric IDs)
        if (!providerParam) {
            const fallbackChain: ProviderName[] = ["allanime", "hianime"];

            for (const fallback of fallbackChain) {
                if (fallback === provider) continue;

                try {
                    console.log(`[Episodes] Retrying with fallback: ${fallback}`);
                    const fbProvider = getProvider(fallback);
                    const info = await fbProvider.getInfo(id);
                    return NextResponse.json({ show: mapInfoToShow(info) });
                } catch (e: any) {
                    console.log(`[Episodes] Fallback ${fallback} failed: ${e.message}`);
                }
            }
        }

        // Graceful 500 -> 404 handling check
        if (error.message.includes("404") || error.message.includes("not found")) {
            return NextResponse.json({ error: "Anime not found" }, { status: 404 });
        }

        return NextResponse.json(
            { error: `Failed to fetch episodes: ${error.message}` },
            { status: 500 }
        );
    }
}

// Helper: Fetch Title from AniList with Retry & Caching
const titleCache = new Map<string, string[]>();

async function fetchAniListTitles(id: string): Promise<string[]> {
    if (titleCache.has(id)) {
        console.log(`[Episodes] Cache hit for AniList ID: ${id}`);
        return titleCache.get(id) || [];
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const query = `
            query ($id: Int) {
                Media (id: $id, type: ANIME) {
                    title {
                        romaji
                        english
                    }
                    synonyms
                }
            }
            `;
            const res = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query, variables: { id: parseInt(id) } })
            });

            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After') || '2';
                console.warn(`[Episodes] AniList 429 (Rate Limit). Retrying in ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000 + 1000));
                attempt++;
                continue;
            }

            const data = await res.json();
            const media = data?.data?.Media;

            const titlesToTry: string[] = [];

            // Priority 1: English (Usually most standardized across providers)
            if (media?.title?.english) titlesToTry.push(media.title.english);

            // Priority 2: Romaji (Standard Fallback)
            if (media?.title?.romaji && media.title.romaji !== media?.title?.english) {
                titlesToTry.push(media.title.romaji);
            }

            // Priority 3: Synonyms (Crucial for classic anime with specific alternative names)
            if (media?.synonyms && Array.isArray(media.synonyms)) {
                // Take up to 2 popular synonyms to prevent API spamming
                titlesToTry.push(...media.synonyms.slice(0, 2));
            }

            // Remove empty/undefined and duplicates
            const finalTitles = Array.from(new Set(titlesToTry.filter(Boolean)));

            if (finalTitles.length > 0) {
                titleCache.set(id, finalTitles);
            }
            return finalTitles;

        } catch (e: any) {
            console.error(`[Episodes] AniList fetch attempt ${attempt + 1} failed:`, e.message);
            attempt++;
            await new Promise(r => setTimeout(r, 1000)); // Basic backoff
        }
    }
    return [];
}

// Helper: Map Provider Info to Show Object
function mapInfoToShow(info: any) {
    if (!info) return null;

    // Safety checks for missing fields
    const episodes = info.episodes || [];
    const subEps = info.availableEpisodesDetail?.sub
        ? info.availableEpisodesDetail.sub
        : (Array.isArray(episodes)
            ? Array.from(new Set(episodes.map((ep: any) => ep?.number?.toString()).filter(Boolean)))
            : []);

    const dubEps = info.availableEpisodesDetail?.dub
        ? info.availableEpisodesDetail.dub
        : (info.availableEpisodes?.dub
            ? Array.from({ length: info.availableEpisodes.dub }, (_, i) => (i + 1).toString())
            : []);

    return {
        _id: info.id || "unknown",
        name: info.title || "Unknown Title",
        englishName: info.title,
        thumbnail: info.image,
        aniListId: info.anilistId,
        malId: info.malId,
        availableEpisodesDetail: {
            sub: subEps,
            dub: dubEps
        }
    };
}
