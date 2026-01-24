import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get("provider") as ProviderName) || "allanime";
    const page = parseInt(searchParams.get("page") || "1");

    try {
        const animeProvider = getProvider(provider);

        if (!animeProvider.getRecent) {
            return NextResponse.json({ error: "Provider does not support getRecent" }, { status: 400 });
        }

        const results = await animeProvider.getRecent(page);

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
        console.error(`[Recent] Provider ${provider} failed:`, error);
        return NextResponse.json(
            { error: `Failed to fetch recent anime: ${error.message}` },
            { status: 500 }
        );
    }
}
