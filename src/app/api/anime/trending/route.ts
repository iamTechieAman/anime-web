import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export const revalidate = 0;

export async function GET() {
    try {
        const provider = getProvider("anikai");

        // Safety check: ensure provider supports getPopular
        if (!provider.getPopular) {
            console.warn(`[Trending] Provider ${provider.name} does not support getPopular`);
            return NextResponse.json({ shows: [] });
        }

        const results = await provider.getPopular(1);

        const shows = results.map(result => ({
            _id: result.id,
            name: result.title,
            thumbnail: result.image,
            availableEpisodes: result.subOrDub,
            provider: "anikai",
            rating: 0,
            __typename: "Show"
        }));

        return NextResponse.json({ shows });
    } catch (error) {
        console.error("[Trending] Failed to fetch trending anime:", error);
        return NextResponse.json({ shows: [] });
    }
}
