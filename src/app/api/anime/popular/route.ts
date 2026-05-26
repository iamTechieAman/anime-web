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
                // Convert to old format for backward compatibility
                const shows = results.map((result: any) => ({
                    _id: result.id,
                    name: result.title,
                    thumbnail: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || providerName,
                    __typename: "Show"
                }));

                return NextResponse.json({ shows });
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
