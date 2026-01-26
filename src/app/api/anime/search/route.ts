import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const requestedProvider = searchParams.get("provider") as ProviderName;

    // Priority: AllAnime (Verified) -> AniWatch (Verified) -> HiAnime (Mirror) -> Anikai (Broken)
    const providersToTry: ProviderName[] = requestedProvider
        ? [requestedProvider]
        : ["allanime", "aniwatch", "hianime"];

    if (!query) {
        return NextResponse.json({ shows: [] });
    }

    for (const provider of providersToTry) {
        try {
            console.log(`[Search] Searching '${query}' on ${provider}...`);
            const animeProvider = getProvider(provider);
            const results = await animeProvider.search(query);

            if (results && results.length > 0) {
                // Convert to old format for backward compatibility
                const shows = results.map(result => ({
                    _id: result.id,
                    name: result.title,
                    thumbnail: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || provider,
                    __typename: "Show"
                }));
                return NextResponse.json({ shows, provider }, {
                    headers: {
                        'Cache-Control': 'no-store, max-age=0'
                    }
                });
            }
        } catch (error: any) {
            console.warn(`[Search] Provider ${provider} failed: ${error.message}`);
        }
    }

    // If all fail
    return NextResponse.json({ shows: [] }); // Return empty list instead of 500
}
