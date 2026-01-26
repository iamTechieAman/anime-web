import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get("provider") as ProviderName) || "allanime";
    const page = parseInt(searchParams.get("page") || "1");

    try {
        const animeProvider = getProvider(provider);

        if (!animeProvider.getPopular) {
            return NextResponse.json({ error: "Provider does not support getPopular" }, { status: 400 });
        }

        const results = await animeProvider.getPopular(page);

        // Convert to old format for backward compatibility
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
        console.error(`[Popular] Provider ${provider} failed:`, error);
        return NextResponse.json(
            { error: `Failed to fetch popular anime: ${error.message}` },
            { status: 500 }
        );
    }
}
