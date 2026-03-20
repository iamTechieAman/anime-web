import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get("episodeId");
    const provider = (searchParams.get("provider") as ProviderName) || "hianime";

    if (!episodeId) {
        return NextResponse.json({ error: "Episode ID is required" }, { status: 400 });
    }

    try {
        const animeProvider = getProvider(provider);

        if (!animeProvider.getServers) {
            return NextResponse.json({ error: "Provider does not support server fetching" }, { status: 400 });
        }

        const servers = await animeProvider.getServers(episodeId);

        return NextResponse.json({ servers });
    } catch (error: any) {
        console.error(`[Servers] Provider ${provider} failed:`, error);
        return NextResponse.json(
            { error: `Failed to fetch servers: ${error.message}` },
            { status: 500 }
        );
    }
}
