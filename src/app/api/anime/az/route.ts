import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const letter = searchParams.get("letter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const providerParam = searchParams.get("provider");

    // List of providers to try in order
    // If user didn't force a specific provider, try Anikai first (scraper works), then HiAnime (backup).
    const providersToTry: ProviderName[] = providerParam
        ? [providerParam as ProviderName]
        : ["anikai", "hianime"];

    const errors: any[] = [];

    for (const providerName of providersToTry) {
        try {
            console.log(`[A-Z] Trying provider: ${providerName} for letter: ${letter}`);
            const animeProvider = getProvider(providerName);

            if (!animeProvider.getAZList) {
                console.warn(`[A-Z] Provider ${providerName} does not support A-Z list, skipping.`);
                continue;
            }

            const results = await animeProvider.getAZList(letter, page);

            if (results && results.length > 0) {
                console.log(`[A-Z] Successfully fetched ${results.length} items from ${providerName}`);
                // Wrap in 'shows' for consistency with other endpoints
                const shows = results.map(result => ({
                    _id: result.id,
                    name: result.title,
                    thumbnail: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || providerName,
                    __typename: "Show"
                }));

                return NextResponse.json({ shows, provider: providerName });
            } else {
                console.warn(`[A-Z] Provider ${providerName} returned 0 results.`);
                errors.push({ provider: providerName, error: "No results found" });
            }
        } catch (error: any) {
            console.error(`[A-Z] Provider ${providerName} failed:`, error.message);
            errors.push({ provider: providerName, error: error.message });
        }
    }

    // If we get here, all providers failed
    return NextResponse.json(
        { error: "All providers failed to fetch A-Z list", details: errors },
        { status: 500 }
    );
}
