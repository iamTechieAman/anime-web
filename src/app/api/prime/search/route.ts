import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

const TMDB_GENRE_MAP: Record<string, number> = {
    "action": 28, "adventure": 12, "animation": 16, "comedy": 35, "crime": 80, "documentary": 99,
    "drama": 18, "family": 10751, "fantasy": 14, "history": 36, "horror": 27, "music": 10402,
    "mystery": 9648, "romance": 10749, "science fiction": 878, "sci-fi": 878, "tv movie": 10770,
    "thriller": 53, "war": 10752, "western": 37
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawQuery = searchParams.get("q") || searchParams.get("query") || "";
        const query = rawQuery.trim();
        const genre = searchParams.get("genre");
        const status = searchParams.get("status");
        const page = searchParams.get("page") || "1";

        let url = `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=${page}&language=en-US&include_adult=false`;

        // Use Discover API for Genre or Status filtering if query is empty
        if (!query.trim()) {
            if (genre) {
                const genreId = TMDB_GENRE_MAP[genre.toLowerCase()];
                if (genreId) {
                    url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=${genreId}&page=${page}&language=en-US&sort_by=popularity.desc`;
                } else {
                    return NextResponse.json({ results: [], page: 1, total_pages: 0 });
                }
            } else if (status) {
                // Approximate status by sorting or other criteria if needed
                url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&page=${page}&language=en-US&sort_by=primary_release_date.desc`;
            } else {
                return NextResponse.json({ results: [], page: 1, total_pages: 0 });
            }
        }

        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

        const data = await res.json();
        let filtered = Array.isArray(data.results) 
            ? data.results.filter((item: any) => item.media_type === "movie" || item.media_type === "tv" || !item.media_type)
            : [];

        if (query.trim() && genre) {
            const genreId = TMDB_GENRE_MAP[genre.toLowerCase()];
            if (genreId) {
                filtered = filtered.filter((item: any) => item.genre_ids && item.genre_ids.includes(genreId));
            }
        }

        return NextResponse.json({
            results: filtered.map((item: any) => ({
                ...item,
                id: item.id,
                media_type: item.media_type || (item.title ? "movie" : "tv")
            })),
            page: data.page || 1,
            total_pages: data.total_pages || 0,
            total_results: data.total_results || 0,
        });
    } catch (error: any) {
        console.error("Search API error:", error);
        return NextResponse.json({ error: "Failed to search" }, { status: 500 });
    }
}
