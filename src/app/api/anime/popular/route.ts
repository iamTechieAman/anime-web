import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 3600;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

    // List of providers to try in order
    const requestedProvider = searchParams.get("provider") as ProviderName;
    const providersToTry: ProviderName[] = requestedProvider
        ? [requestedProvider]
        : ["aniwave", "aniwatchtv", "hianime", "allanime", "consumet", "aniwatch"];

    const errors: any[] = [];

    for (const providerName of providersToTry) {
        try {
            console.log(`[Popular] Trying provider: ${providerName}`);
            const animeProvider = getProvider(providerName);

            // Consumet uses getTop for popular, handle method mapping gracefully
            const fetchMethod = animeProvider.getPopular || animeProvider.getTop;

            if (!fetchMethod) {
                console.warn(`[Popular] Provider ${providerName} does not support getPopular or getTop, skipping.`);
                continue;
            }

            const results = await fetchMethod.bind(animeProvider)(page);

            if (results && results.length > 0) {
                console.log(`[Popular] Successfully fetched ${results.length} items from ${providerName}`);
                // Convert to standard format with consistent identity fields
                const shows = results.map((result: any) => ({
                    _id: String(result.id),
                    id: String(result.id),
                    showId: String(result.id),
                    name: result.title,
                    title: result.title,
                    thumbnail: result.image,
                    image: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || providerName,
                    type: "anime",
                    media_type: "anime",
                    __typename: "Show"
                }));

                return NextResponse.json({ shows }, {
                    headers: {
                        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                    }
                });
            } else {
                console.warn(`[Popular] Provider ${providerName} returned 0 results.`);
                errors.push({ provider: providerName, error: "No results found" });
            }

        } catch (error: any) {
            console.error(`[Popular] Provider ${providerName} failed:`, error.message);
            errors.push({ provider: providerName, error: error.message });
        }
    }

    // If we get here, all providers failed
    return NextResponse.json(
        { error: "All providers failed to fetch popular anime", details: errors },
        { status: 500 }
    );
}
