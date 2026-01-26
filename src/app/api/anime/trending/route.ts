import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export const revalidate = 0;

export async function GET() {
    try {
        const provider = getProvider("anikai"); // Anikai usually has good trending data
        const results = await provider.getPopular(1); // Re-using popular for trending base for now

        const shows = results.map(result => ({
            _id: result.id,
            name: result.title,
            thumbnail: result.image,
            availableEpisodes: result.subOrDub,
            provider: "anikai",
            rating: result.rating || 0, // Assuming provider might return rating
            __typename: "Show"
        }));

        return NextResponse.json({ shows });
    } catch (error) {
        return NextResponse.json({ shows: [] });
    }
}
