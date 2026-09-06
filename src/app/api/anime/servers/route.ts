import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { normalizeProvider } from "@/lib/providers/AnimeProviderManager";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get("episodeId");
    const rawProvider = searchParams.get("provider");
    const provider = normalizeProvider(rawProvider);

    if (!episodeId) {
        return NextResponse.json({ error: "Episode ID is required", servers: [] }, { status: 400 });
    }

    try {
        const animeProvider = getProvider(provider);

        if (!animeProvider?.getServers) {
            return NextResponse.json({ servers: [] }, { status: 200 });
        }

        const servers = await Promise.race([
            animeProvider.getServers(episodeId),
            new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Servers Timeout after 6000ms')), 6000))
        ]);

        return NextResponse.json({ servers: Array.isArray(servers) ? servers : [] });
    } catch (error: any) {
        console.warn(`[Servers] Provider ${provider} failed for ${episodeId}:`, error.message);
        return NextResponse.json({ servers: [] }, { status: 200 });
    }
}
