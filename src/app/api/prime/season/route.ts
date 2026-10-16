import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { animeCache, TTL, cacheKey } from "@/lib/anime-cache";
import { TwoEmbedProvider } from "@/lib/providers/twoembed";

const twoEmbed = new TwoEmbedProvider();
const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const season = searchParams.get("season") || "1";

        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        const cKey = cacheKey.tmdbSeason(id, season);
        const cached = animeCache.get(cKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=3600' }
            });
        }

        let data: any = null;
        try {
            const res = await fetchWithTimeout(`${TMDB_BASE}/tv/${id}/season/${season}?api_key=${TMDB_KEY}&language=en-US`, {}, 3000);
            if (res.ok) {
                data = await res.json();
            }
        } catch (e) {
            console.warn(`[Season API] Live TMDB fetch failed for show ${id} season ${season}:`, (e as any)?.message);
        }

        // Optional 2Embed Season Details Fallback before synthetic generation
        if (!data || !data.episodes || data.episodes.length === 0) {
            try {
                const twoEmbedSeason = await twoEmbed.getSeasonDetails({ tmdbId: id }, season);
                if (twoEmbedSeason && twoEmbedSeason.episodes.length > 0) {
                    data = {
                        _id: `season_${id}_${season}`,
                        id: Number(id) || id,
                        season_number: twoEmbedSeason.season_number,
                        name: twoEmbedSeason.name,
                        episodes: twoEmbedSeason.episodes.map(ep => ({
                            id: ep.id,
                            episode_number: ep.episode_number,
                            season_number: ep.season_number,
                            name: ep.name,
                            overview: ep.overview,
                            still_path: ep.still_path,
                            air_date: ep.air_date || "2024-01-01",
                        })),
                        provider: 'twoembed',
                    };
                }
            } catch (twoEmbedErr) {
                console.warn(`[Season API] 2Embed season fallback failed for ${id}:`, (twoEmbedErr as any)?.message);
            }
        }

        if (!data || !data.episodes || data.episodes.length === 0) {
            const seasonNum = parseInt(season, 10) || 1;
            const fallbackCount = 10;
            data = {
                _id: `season_${id}_${season}`,
                id: Number(id),
                season_number: seasonNum,
                name: `Season ${seasonNum}`,
                episodes: Array.from({ length: fallbackCount }, (_, i) => ({
                    id: Number(`${id}${seasonNum}${i + 1}`),
                    episode_number: i + 1,
                    season_number: seasonNum,
                    name: `Episode ${i + 1}`,
                    overview: `Season ${seasonNum} Episode ${i + 1}`,
                    still_path: null,
                    air_date: "2024-01-01"
                }))
            };
        }

        animeCache.set(cKey, data, TTL.EPISODE_LIST);

        return NextResponse.json(data, {
            headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=3600' }
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
