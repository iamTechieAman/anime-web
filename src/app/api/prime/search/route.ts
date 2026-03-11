export const runtime = "edge";
import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || searchParams.get("query") || "";
        const page = searchParams.get("page") || "1";

        if (!query.trim()) {
            return NextResponse.json({ results: [], page: 1, total_pages: 0, total_results: 0 });
        }

        const res = await fetch(
            `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=${page}&language=en-US&include_adult=false`,
            { next: { revalidate: 60 } }
        );

        if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

        const data = await res.json();

        // Filter out people results, keep only movie and tv
        const filtered = data.results.filter(
            (item: any) => item.media_type === "movie" || item.media_type === "tv"
        );

        return NextResponse.json({
            results: filtered,
            page: data.page,
            total_pages: data.total_pages,
            total_results: data.total_results,
        });
    } catch (error: any) {
        console.error("Search API error:", error);
        return NextResponse.json(
            { error: "Failed to search" },
            { status: 500 }
        );
    }
}
