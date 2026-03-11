export const runtime = "edge";
import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const providerName = (searchParams.get("provider") as ProviderName) || "hianime";

    try {
        const animeProvider = getProvider(providerName);

        if (!animeProvider.getCompleted) {
            return NextResponse.json({ error: "Provider does not support getCompleted" }, { status: 400 });
        }

        const results: any[] = await animeProvider.getCompleted();

        const shows = results.map((result: any) => ({
            _id: result.id,
            name: result.title,
            thumbnail: result.image,
            availableEpisodes: result.subOrDub,
            provider: result.provider || providerName,
            __typename: "Show"
        }));

        return NextResponse.json({ shows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
