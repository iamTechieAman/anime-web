import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const rawType = searchParams.get("type") || "movie";

        if (!id || id === "undefined" || id === "null" || isNaN(Number(id))) {
            return NextResponse.json({ error: "Missing or invalid id parameter" }, { status: 400 });
        }

        // Strict validation — only TMDB-valid types allowed
        let type = rawType === "tv" ? "tv" : "movie";

        // Attempt primary fetch
        let detailsRes = await fetch(`${TMDB_BASE}/${type}/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } });

        // Auto fallback retry with the other type if 404 is encountered
        if (!detailsRes.ok && detailsRes.status === 404) {
            const otherType = type === "tv" ? "movie" : "tv";
            const retryRes = await fetch(`${TMDB_BASE}/${otherType}/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } });
            if (retryRes.ok) {
                type = otherType;
                detailsRes = retryRes;
            }
        }

        if (!detailsRes.ok) {
            const status = detailsRes.status;
            // If TMDB says 404, it's a bad id/type combo — return 404, not 500
            if (status === 404) {
                return NextResponse.json({ error: "Content not found on TMDB" }, { status: 404 });
            }
            // Rate limit or upstream error
            throw new Error(`TMDB details error: ${status}`);
        }

        // Fetch other metadata in parallel for the resolved type
        const [creditsRes, videosRes, similarRes, recommendationsRes] = await Promise.all([
            fetch(`${TMDB_BASE}/${type}/${id}/credits?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
            fetch(`${TMDB_BASE}/${type}/${id}/videos?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
            fetch(`${TMDB_BASE}/${type}/${id}/similar?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }),
            fetch(`${TMDB_BASE}/${type}/${id}/recommendations?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }),
        ]);

        const [details, credits, videos, similar, recommendations] = await Promise.all([
            detailsRes.json(),
            creditsRes.ok ? creditsRes.json() : { cast: [], crew: [] },
            videosRes.ok ? videosRes.json() : { results: [] },
            similarRes.ok ? similarRes.json() : { results: [] },
            recommendationsRes.ok ? recommendationsRes.json() : { results: [] },
        ]);

        // Find trailer
        const trailer = videos.results?.find(
            (v: any) => v.type === "Trailer" && v.site === "YouTube"
        ) || videos.results?.[0];

        return NextResponse.json({
            ...details,
            resolvedType: type,
            cast: credits.cast?.slice(0, 20) || [],
            crew: credits.crew?.slice(0, 10) || [],
            trailer: trailer ? { key: trailer.key, name: trailer.name, site: trailer.site } : null,
            similar: similar.results?.slice(0, 12) || [],
            recommendations: recommendations.results?.slice(0, 12) || [],
        }, {
            headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' }
        });
    } catch (error: any) {
        console.error("Details API error:", error?.message || error);
        return NextResponse.json(
            { error: "Failed to fetch details", message: error?.message },
            { status: 500 }
        );
    }
}
