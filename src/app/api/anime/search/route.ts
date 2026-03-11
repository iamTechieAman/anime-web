export const runtime = "edge";
import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const genre = searchParams.get("genre");
    const status = searchParams.get("status");
    const format = searchParams.get("format");
    const requestedProvider = searchParams.get("provider") as ProviderName;

    // Priority: AllAnime (Verified) -> AniWatch (Verified) -> HiAnime (Mirror)
    const providersToTry: ProviderName[] = requestedProvider
        ? [requestedProvider]
        : ["allanime", "hianime", "aniwatch"];

    if (!query && !genre && !status && !format) {
        return NextResponse.json({ shows: [] });
    }

    try {
        // Search all providers in parallel
        const searchPromises = providersToTry.map(async (provider) => {
            try {
                const animeProvider = getProvider(provider);
                
                let results: any[] = [];
                
                if (query) {
                    results = await animeProvider.search(query);
                } else if (genre && animeProvider.getGenre) {
                    results = await animeProvider.getGenre(genre);
                } else if (status && animeProvider.getRecent) {
                    results = await animeProvider.getRecent();
                }

                // Apply basic format/status filtering if they were passed but provider didn't handle it
                // (This is a naive filter on search results)
                if (results && results.length > 0) {
                     // ... could add filter logic here if results had metadata ...
                }

                return (results || []).map(result => ({
                    _id: result.id,
                    name: result.title,
                    thumbnail: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || provider,
                    __typename: "Show"
                }));
            } catch (err: any) {
                console.warn(`[Search] ${provider} failed:`, err.message);
                return [];
            }
        });

        const allResults = await Promise.all(searchPromises);

        // Flatten and de-duplicate by name to provide a clean list
        const flattened = allResults.flat();
        const seen = new Set();
        const uniqueShows = flattened.filter(show => {
            const key = show.name.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return NextResponse.json({
            shows: uniqueShows.slice(0, 30), // Limit to top 30 unique results
            count: uniqueShows.length
        }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });

    } catch (error: any) {
        console.error("[Search] Critical failure:", error.message);
        return NextResponse.json({ shows: [] });
    }
}
