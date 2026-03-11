import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

    // List of providers to try in order
    const requestedProvider = searchParams.get("provider") as ProviderName;
    const providersToTry: ProviderName[] = requestedProvider
        ? [requestedProvider]
        : ["consumet", "allanime", "aniwatch", "hianime"];

    const errors: any[] = [];

    for (const providerName of providersToTry) {
        try {
            console.log(`[Top] Trying provider: ${providerName}`);
            const animeProvider = getProvider(providerName);

            if (!animeProvider.getTop) {
                console.warn(`[Top] Provider ${providerName} does not support getTop, skipping.`);
                continue;
            }

            const results = await animeProvider.getTop(page);

            if (results && results.length > 0) {
                console.log(`[Top] Successfully fetched ${results.length} items from ${providerName}`);
                // Convert to old format for backward compatibility
                const shows = results.map(result => ({
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
                console.warn(`[Top] Provider ${providerName} returned 0 results.`);
                errors.push({ provider: providerName, error: "No results found" });
            }

        } catch (error: any) {
            console.error(`[Top] Provider ${providerName} failed:`, error.message);
            errors.push({ provider: providerName, error: error.message });
        }
    }

    // If we get here, all providers failed
    return NextResponse.json(
        { error: "All providers failed to fetch top anime", details: errors },
        { status: 500 }
    );
}
