import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

    const requestedProvider = searchParams.get("provider") as ProviderName;
    const providersToTry: ProviderName[] = requestedProvider
        ? [requestedProvider]
        : ["anikai", "consumet", "allanime", "aniwatch", "hianime"];

    const errors: any[] = [];

    for (const providerName of providersToTry) {
        try {
            console.log(`[Trending] Trying provider: ${providerName}`);
            const animeProvider = getProvider(providerName);

            const fetchMethod = animeProvider.getTrending || animeProvider.getPopular || animeProvider.getTop;

            if (!fetchMethod) {
                console.warn(`[Trending] Provider ${providerName} does not support getTrending, skipping.`);
                continue;
            }

            const results = await fetchMethod.bind(animeProvider)(page);

            if (results && results.length > 0) {
                console.log(`[Trending] Successfully fetched ${results.length} items from ${providerName}`);
                const shows = results.map((result: any) => ({
                    _id: result.id,
                    name: result.title,
                    thumbnail: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || providerName,
                    __typename: "Show"
                }));

                return NextResponse.json({ shows }, {
                    headers: {
                        'Cache-Control': 'no-store, max-age=0'
                    }
                });
            } else {
                console.warn(`[Trending] Provider ${providerName} returned 0 results.`);
                errors.push({ provider: providerName, error: "No results found" });
            }

        } catch (error: any) {
            console.error(`[Trending] Provider ${providerName} failed:`, error.message);
            errors.push({ provider: providerName, error: error.message });
        }
    }

    return NextResponse.json(
        { error: "All providers failed to fetch trending anime", details: errors },
        { status: 500 }
    );
}
