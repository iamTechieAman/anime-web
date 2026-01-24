import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const provider = (searchParams.get("provider") as ProviderName) || "allanime";

    if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    try {
        const animeProvider = getProvider(provider);
        const results = await animeProvider.search(query);

        // Convert to old format for backward compatibility
        const shows = results.map(result => ({
            _id: result.id,
            name: result.title,
            thumbnail: result.image,
            availableEpisodes: result.subOrDub,
            __typename: "Show"
        }));

        return NextResponse.json({ shows });
    } catch (error: any) {
        console.error(`[Search] Provider ${provider} failed:`, error);
        return NextResponse.json(
            { error: `Search failed: ${error.message}` },
            { status: 500 }
        );
    }
}
