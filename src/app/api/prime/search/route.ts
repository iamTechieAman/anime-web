import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { TwoEmbedProvider } from "@/lib/providers/twoembed";

const twoEmbed = new TwoEmbedProvider();
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

        const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } }, 8000);
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
        }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }
        });
    } catch (error: any) {
        console.error("Search API error:", error?.message || error);

        // 1. Optional 2Embed search fallback
        try {
            const { searchParams } = new URL(request.url);
            const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
            if (query) {
                const [twoEmbedMovies, twoEmbedTv] = await Promise.all([
                    twoEmbed.searchMovies(query).catch(() => []),
                    twoEmbed.searchTv(query).catch(() => []),
                ]);

                const combined = [...twoEmbedMovies, ...twoEmbedTv];
                if (combined.length > 0) {
                    return NextResponse.json({
                        results: combined.slice(0, 20).map(item => ({
                            id: item.tmdb_id || item.imdb_id || item.id,
                            tmdb_id: item.tmdb_id,
                            imdb_id: item.imdb_id,
                            title: item.title,
                            name: item.name,
                            overview: item.overview,
                            poster_path: item.poster_path,
                            backdrop_path: item.backdrop_path,
                            media_type: item.media_type,
                            provider: 'twoembed',
                        })),
                        page: 1,
                        total_pages: 1,
                        total_results: combined.length,
                        fromProvider: 'twoembed',
                    }, {
                        headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=86400' }
                    });
                }
            }
        } catch (twoEmbedErr: any) {
            console.warn("[Search API] 2Embed search fallback failed:", twoEmbedErr?.message);
        }

        // 2. Fallback search over local pre-rendered datasets
        try {
            const fs = await import("fs/promises");
            const path = await import("path");
            const { searchParams } = new URL(request.url);
            const query = (searchParams.get("q") || searchParams.get("query") || "").trim().toLowerCase();

            const fallbackFiles = ["popular_movies.json", "tv_popular.json", "trending_movies.json", "genre_animation.json"];
            const allItems: any[] = [];
            const seenIds = new Set<string | number>();

            for (const file of fallbackFiles) {
                try {
                    const filePath = path.join(process.cwd(), "public", "data", file);
                    const fileContent = await fs.readFile(filePath, "utf-8");
                    const parsed = JSON.parse(fileContent);
                    const list = parsed.results || [];
                    for (const item of list) {
                        if (!seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            allItems.push(item);
                        }
                    }
                } catch {
                    // continue
                }
            }

            let matches = allItems;
            if (query) {
                matches = allItems.filter(item => {
                    const title = (item.title || item.name || "").toLowerCase();
                    const overview = (item.overview || "").toLowerCase();
                    return title.includes(query) || overview.includes(query);
                });
            }

            return NextResponse.json({
                results: matches.slice(0, 20).map(item => ({
                    ...item,
                    id: item.id,
                    media_type: item.media_type || (item.title ? "movie" : "tv")
                })),
                page: 1,
                total_pages: 1,
                total_results: matches.length,
                fromFallback: true
            }, {
                headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }
            });
        } catch (fallbackError) {
            return NextResponse.json({ results: [], page: 1, total_pages: 0, total_results: 0 });
        }
    }
}
