import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get("provider") as ProviderName) || "hianime";
    const page = parseInt(searchParams.get("page") || "1");

    try {
        const animeProvider = getProvider(provider);

        if (!animeProvider.getTop) {
            return NextResponse.json({ error: "Provider does not support getTop" }, { status: 400 });
        }

        const results = await animeProvider.getTop(page);

        // Map to existing frontend format
        const shows = results.map(result => ({
            _id: result.id,
            name: result.title,
            thumbnail: result.image,
            availableEpisodes: result.subOrDub,
            provider: result.provider || provider,
            __typename: "Show"
        }));

        return NextResponse.json({ shows }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error: any) {
        console.error(`[Top] Provider ${provider} failed:`, error);
        return NextResponse.json(
            { error: `Failed to fetch top anime: ${error.message}` },
            { status: 500 }
        );
    }
}
