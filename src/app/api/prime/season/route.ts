import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { animeCache, TTL, cacheKey } from "@/lib/anime-cache";

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

        const res = await fetchWithTimeout(`${TMDB_BASE}/tv/${id}/season/${season}?api_key=${TMDB_KEY}&language=en-US`, {}, 3000);

        if (!res.ok) {
            return NextResponse.json({ error: "Failed to fetch season details" }, { status: res.status });
        }

        const data = await res.json();
        animeCache.set(cKey, data, TTL.EPISODE_LIST);

        return NextResponse.json(data, {
            headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=3600' }
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
