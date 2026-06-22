import { NextResponse } from "next/server";
import { AnimeProviderManager } from "@/lib/providers/AnimeProviderManager";

export const revalidate = 1800;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fullId = searchParams.get("id");

    if (!fullId) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Strip provider prefix if any (e.g., "anilist:123" -> "123")
    const id = fullId.includes(':') ? fullId.split(':').slice(1).join(':') : fullId;

    try {
        // Try to get rich episode data directly from Consumet
        // Consumet supports Anilist IDs via /meta/anilist/info/:id
        const info = await AnimeProviderManager.getInfo(id, 'consumet');

        if (!info) {
            return NextResponse.json({ error: "Anime not found via providers" }, { status: 404 });
        }

        // We map the episodes to ensure they're rich
        const episodesList = info.episodes.map(ep => ({
            id: ep.id,
            number: ep.number,
            title: ep.title,
            image: (ep as any).image,
            description: (ep as any).description,
            isFiller: (ep as any).isFiller,
            hasDub: (ep as any).hasDub,
        }));

        const show = {
            _id: id,
            name: info.title || 'Unknown',
            englishName: info.title || null,
            romajiName: info.otherNames?.[0] || null,
            thumbnail: info.image,
            anilistId: parseInt(id) || info.anilistId,
            malId: info.malId,
            description: info.description,
            availableEpisodesDetail: { 
                sub: episodesList, 
                // We'll pass the same rich list to dub, and filter later if needed
                dub: episodesList
            },
            provider: 'consumet',
        };

        return NextResponse.json({ show });

    } catch (error: any) {
        console.error(`[Episodes] Critical error: ${error.message}`);
        return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }
}
