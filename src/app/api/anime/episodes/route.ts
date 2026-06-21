import { NextResponse } from "next/server";

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
        const query = `
        query ($id: Int) { 
            Media (id: $id, type: ANIME) { 
                id
                idMal
                title { romaji english native } 
                coverImage { extraLarge large }
                episodes
                nextAiringEpisode { episode }
            } 
        }`;

        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id: parseInt(id) } }),
            next: { revalidate: 1800 }
        });

        const data = await res.json();
        const media = data?.data?.Media;

        if (!media) {
            return NextResponse.json({ error: "Anime not found on AniList" }, { status: 404 });
        }

        let totalEpisodes = media.episodes;
        if (!totalEpisodes && media.nextAiringEpisode?.episode) {
            totalEpisodes = media.nextAiringEpisode.episode - 1;
        }

        // If AniList doesn't know, fallback to Jikan
        if (!totalEpisodes && media.idMal) {
            try {
                const jRes = await fetch(`https://api.jikan.moe/v4/anime/${media.idMal}`, { signal: AbortSignal.timeout(5000) });
                const jData = await jRes.json();
                if (jData?.data?.episodes) {
                    totalEpisodes = jData.data.episodes;
                }
            } catch (_) {}
        }

        // If STILL unknown, assume 12 or 24? Actually, better to just provide 1 to 100 if unknown, or rely on streaming API
        if (!totalEpisodes) {
            totalEpisodes = 24; // Default fallback for unknown
        }

        const episodesList = Array.from({ length: totalEpisodes }, (_, i) => String(i + 1));

        const show = {
            _id: id,
            name: media.title.english || media.title.romaji || 'Unknown',
            englishName: media.title.english || null,
            romajiName: media.title.romaji || null,
            thumbnail: media.coverImage.extraLarge || media.coverImage.large,
            anilistId: media.id,
            malId: media.idMal,
            availableEpisodesDetail: { 
                sub: episodesList, 
                dub: episodesList // We'll assume dub exists and let source fetcher fail if not
            },
            provider: 'anilist',
        };

        return NextResponse.json({ show });

    } catch (error: any) {
        console.error(`[Episodes] Critical error: ${error.message}`);
        return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }
}
