import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const type = searchParams.get("type") || "movie"; // movie or tv

        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        // Fetch details, credits, videos, similar, and recommendations in parallel
        const [detailsRes, creditsRes, videosRes, similarRes, recommendationsRes] = await Promise.all([
            fetch(`${TMDB_BASE}/${type}/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
            fetch(`${TMDB_BASE}/${type}/${id}/credits?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
            fetch(`${TMDB_BASE}/${type}/${id}/videos?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
            fetch(`${TMDB_BASE}/${type}/${id}/similar?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }),
            fetch(`${TMDB_BASE}/${type}/${id}/recommendations?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }),
        ]);

        if (!detailsRes.ok) throw new Error(`TMDB details error: ${detailsRes.status}`);

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
            cast: credits.cast?.slice(0, 20) || [],
            crew: credits.crew?.slice(0, 10) || [],
            trailer: trailer ? { key: trailer.key, name: trailer.name, site: trailer.site } : null,
            similar: similar.results?.slice(0, 12) || [],
            recommendations: recommendations.results?.slice(0, 12) || [],
        });
    } catch (error: any) {
        console.error("Details API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch details" },
            { status: 500 }
        );
    }
}
