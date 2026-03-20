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
        : ["aniwatch", "hianime", "allanime", "anikai"];

    const errors: any[] = [];

    for (const providerName of providersToTry) {
        try {
            console.log(`[Recent] Trying provider: ${providerName}`);
            const animeProvider = getProvider(providerName);

            if (!animeProvider.getRecent) {
                console.warn(`[Recent] Provider ${providerName} does not support getRecent, skipping.`);
                continue;
            }

            const results = await animeProvider.getRecent(page);

            if (results && results.length > 0) {
                console.log(`[Recent] Successfully fetched ${results.length} items from ${providerName}`);
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
                console.warn(`[Recent] Provider ${providerName} returned 0 results.`);
                errors.push({ provider: providerName, error: "No results found" });
            }

        } catch (error: any) {
            console.error(`[Recent] Provider ${providerName} failed:`, error.message);
            errors.push({ provider: providerName, error: error.message });
        }
    }

    // If we get here, all providers failed
    return NextResponse.json(
        { error: "All providers failed to fetch recent anime", details: errors },
        { status: 500 }
    );
}
