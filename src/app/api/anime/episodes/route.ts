import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const providerParam = searchParams.get("provider") as ProviderName;

    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Heuristic detection: HiAnime IDs usually end with hyphen+number (e.g. one-piece-100)
    // AllAnime IDs are usually 16+ chars hash or short hashes
    const isHiAnimeId = /-[0-9]+$/.test(id);
    const defaultProvider = isHiAnimeId ? "hianime" : "allanime";
    const provider = providerParam || defaultProvider;

    try {
        const animeProvider = getProvider(provider);
        console.log(`[Episodes] Fetching info for ID: ${id} using provider: ${provider}`);
        const info = await animeProvider.getInfo(id);

        // Convert to old format for backward compatibility
        const show = {
            _id: info.id,
            name: info.title,
            englishName: info.title,
            thumbnail: info.image,
            aniListId: info.anilistId,
            malId: info.malId,
            availableEpisodesDetail: {
                sub: info.episodes && Array.isArray(info.episodes)
                    ? Array.from(new Set(info.episodes.map(ep => ep.number.toString()).filter(Boolean)))
                    : [],
                dub: info.availableEpisodes?.dub ?
                    Array.from({ length: info.availableEpisodes.dub }, (_, i) => (i + 1).toString()) : []
            }
        };

        return NextResponse.json({ show });
    } catch (error: any) {
        console.error(`[Episodes] Provider ${provider} failed:`, error.message);

        // If detection failed or provider failed, try the other one as fallback if not explicitly requested
        if (!providerParam) {
            const fallbackProvider = provider === "allanime" ? "hianime" : "allanime";
            try {
                console.log(`[Episodes] Retrying with fallback provider: ${fallbackProvider}`);
                const fallbackAnimeProvider = getProvider(fallbackProvider);
                const info = await fallbackAnimeProvider.getInfo(id);

                const show = {
                    _id: info.id,
                    name: info.title,
                    englishName: info.title,
                    thumbnail: info.image,
                    aniListId: info.anilistId,
                    malId: info.malId,
                    availableEpisodesDetail: {
                        sub: info.episodes && Array.isArray(info.episodes)
                            ? Array.from(new Set(info.episodes.map(ep => ep.number.toString()).filter(Boolean)))
                            : [],
                        dub: info.availableEpisodes?.dub ?
                            Array.from({ length: info.availableEpisodes.dub }, (_, i) => (i + 1).toString()) : []
                    }
                };
                return NextResponse.json({ show });
            } catch (fallbackError: any) {
                console.error(`[Episodes] Fallback provider ${fallbackProvider} also failed:`, fallbackError.message);
            }
        }

        return NextResponse.json(
            { error: `Failed to fetch episodes: ${error.message}` },
            { status: 500 }
        );
    }
}
