import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q");

        if (!q) {
            return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
        }

        const res = await fetch(
            `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1&include_adult=false`,
            { next: { revalidate: 300 } }
        );

        if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

        const data = await res.json();

        const results = (data.results || [])
            .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
            .slice(0, 24)
            .map((item: any) => ({
                id: item.id,
                title: item.title || item.name || "Unknown",
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                overview: item.overview,
                media_type: item.media_type,
                vote_average: item.vote_average,
                release_date: item.release_date || item.first_air_date || "",
                image: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : "",
            }));

        return NextResponse.json({ results, total_results: data.total_results });
    } catch (error: any) {
        console.error("CinEvo Search API error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
