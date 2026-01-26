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
                const title = await fetchAniListTitle(id);

                if (title) {
                    console.log(`[Episodes] Resolved Title: "${title}". Searching on providers...`);

                    // VALIDATED: AllAnime is currently the most reliable for search
                    const allAnime = getProvider("allanime");
                    let searchResults = await allAnime.search(title);

                    // Fallback to HiAnime if AllAnime fails (though HiAnime failed validation recently)
                    if (searchResults.length === 0) {
                        console.log(`[Episodes] AllAnime search empty. Trying HiAnime...`);
                        const hiAnime = getProvider("hianime");
                        searchResults = await hiAnime.search(title);
                    }

                    if (searchResults.length > 0) {
                        const bestMatch = searchResults[0];
                        console.log(`[Episodes] Found match: ${bestMatch.title} (${bestMatch.id}). Fetching info...`);

                        // Re-fetch provider to ensure we use the correct one for getInfo
                        // Since we searched on AllAnime (or HiAnime), we must use THAT provider.
                        // We can identify which one by checking if the ID starts with specific chars or by context.
                        // Ideally we'd persist the provider name, but for now:

                        const usedProviderName = bestMatch.id.length > 15 ? "allanime" : "hianime"; // Heuristic: AllAnime IDs are hash-like
                        const infoProvider = getProvider(usedProviderName as any);

                        const info = await infoProvider.getInfo(bestMatch.id);
                        return NextResponse.json({
                            show: mapInfoToShow(info)
                        });
                    } else {
                        console.warn(`[Episodes] No search results found for "${title}" on any provider.`);
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
const titleCache = new Map<string, string>();

async function fetchAniListTitle(id: string): Promise<string | null> {
    if (titleCache.has(id)) {
        console.log(`[Episodes] Cache hit for AniList ID: ${id}`);
        return titleCache.get(id) || null;
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
            const title = media?.title?.english || media?.title?.romaji || null;

            if (title) {
                titleCache.set(id, title);
            }
            return title;

        } catch (e: any) {
            console.error(`[Episodes] AniList fetch attempt ${attempt + 1} failed:`, e.message);
            attempt++;
            await new Promise(r => setTimeout(r, 1000)); // Basic backoff
        }
    }
    return null;
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
