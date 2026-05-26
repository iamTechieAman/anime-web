import { NextResponse } from "next/server";

const TMDB_KEY = process.env.TMDB_API_KEY || "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category") || "popular";
        const page = searchParams.get("page") || "1";
        const genreId = searchParams.get("genre") || "";

        let endpoint = "";

        switch (category) {
            case "now_playing":
                endpoint = `/movie/now_playing`;
                break;
            case "top_rated":
                endpoint = `/movie/top_rated`;
                break;
            case "upcoming":
                endpoint = `/movie/upcoming`;
                break;
            case "popular":
            default:
                endpoint = `/movie/popular`;
                break;
        }

        let url = `${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}&page=${page}&language=en-US`;
        if (genreId) {
            url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&page=${page}&language=en-US&with_genres=${genreId}&sort_by=popularity.desc`;
        }

        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

        const data = await res.json();

        return NextResponse.json({
            results: data.results,
            page: data.page,
            total_pages: data.total_pages,
            total_results: data.total_results,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (error: any) {
        console.error("Prime Root API error:", error);
        
        // Fallback to local static JSON files
        try {
            const { searchParams } = new URL(request.url);
            const category = searchParams.get("category") || "popular";
            const genreId = searchParams.get("genre") || "";
            
            let fileName = "popular_movies.json";
            if (genreId) {
                fileName = "genre_action.json"; // default genre fallback
            } else {
                switch (category) {
                    case "now_playing":
                        fileName = "now_playing_movies.json";
                        break;
                    case "top_rated":
                        fileName = "top_rated_movies.json";
                        break;
                    case "upcoming":
                        fileName = "trending_movies.json";
                        break;
                }
            }
            
            const fallbackUrl = new URL(`/data/${fileName}`, request.url);
            const fallbackRes = await fetch(fallbackUrl);
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                console.log(`[Prime API] Loaded fallback static file: ${fileName}`);
                return NextResponse.json({
                    results: data.results || [],
                    page: 1,
                    total_pages: 1,
                    total_results: data.results?.length || 0,
                    fromFallback: true
                });
            }
        } catch (fallbackErr: any) {
            console.error("Prime Root fallback error:", fallbackErr.message);
        }

        return NextResponse.json(
            { error: "Failed to fetch content", results: [], page: 1, total_pages: 1 },
            { status: 200 }
        );
    }
}
