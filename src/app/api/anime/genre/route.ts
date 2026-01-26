import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("name") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const provider = (searchParams.get("provider") as ProviderName) || "hianime";

    if (!genre) {
        return NextResponse.json({ error: "Genre name is required" }, { status: 400 });
    }

    try {
        const animeProvider = getProvider(provider);

        if (!animeProvider.getGenre) {
            return NextResponse.json({ error: "Provider does not support Genre search" }, { status: 400 });
        }

        const results = await animeProvider.getGenre(genre, page);

        const shows = results.map(result => ({
            _id: result.id,
            name: result.title,
            thumbnail: result.image,
            availableEpisodes: result.subOrDub,
            __typename: "Show"
        }));

        return NextResponse.json({ shows });
    } catch (error: any) {
        console.error(`[Genre] Provider ${provider} failed:`, error);
        return NextResponse.json(
            { error: `Failed to fetch genre: ${error.message}` },
            { status: 500 }
        );
    }
}
