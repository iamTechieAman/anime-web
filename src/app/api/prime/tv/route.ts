export const runtime = "edge";
import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category") || "popular";
        const page = searchParams.get("page") || "1";
        const genreId = searchParams.get("genre") || "";

        let endpoint = "";

        switch (category) {
            case "on_the_air":
                endpoint = `/tv/on_the_air`;
                break;
            case "top_rated":
                endpoint = `/tv/top_rated`;
                break;
            case "airing_today":
                endpoint = `/tv/airing_today`;
                break;
            case "popular":
            default:
                endpoint = `/tv/popular`;
                break;
        }

        let url = `${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}&page=${page}&language=en-US`;
        if (genreId) {
            url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&page=${page}&language=en-US&with_genres=${genreId}&sort_by=popularity.desc`;
        }

        const res = await fetch(url, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

        const data = await res.json();

        return NextResponse.json({
            results: data.results,
            page: data.page,
            total_pages: data.total_pages,
            total_results: data.total_results,
        });
    } catch (error: any) {
        console.error("TV Shows API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch TV shows" },
            { status: 500 }
        );
    }
}
