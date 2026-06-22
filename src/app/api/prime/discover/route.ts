import { NextResponse } from "next/server";

async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mediaType = searchParams.get("media_type") || "movie";
    const sortBy = searchParams.get("sort_by") || "popularity.desc";
    const page = searchParams.get("page") || "1";
    const networkId = searchParams.get("network_id");
    const genreId = searchParams.get("genre_id");
    const year = searchParams.get("year");
    const voteAvgGte = searchParams.get("vote_average_gte");
    let watchProviderId = searchParams.get("watch_provider_id");
    const watchRegion = searchParams.get("watch_region") || "US";
    const withOriginalLanguage = searchParams.get("with_original_language");

    // Map TV Network IDs to watch provider IDs for movies
    if (!watchProviderId && networkId && mediaType === "movie") {
        const networkToProvider: Record<string, string> = {
            "213": "8",    // Netflix
            "2739": "337", // Disney+
            "1024": "9",   // Amazon Prime
            "2552": "350", // Apple TV+
            "49": "384",   // HBO Max
            "453": "15",   // Hulu
            "4330": "531"  // Paramount+
        };
        watchProviderId = networkToProvider[networkId] || null;
    }

    try {
        const params = new URLSearchParams({
            api_key: TMDB_KEY,
            language: "en-US",
            page,
            sort_by: sortBy,
            "vote_count.gte": "50",
            include_adult: "false",
        });

        if (withOriginalLanguage) {
            params.set("with_original_language", withOriginalLanguage);
        }
        if (networkId && mediaType === "tv") {
            params.set("with_networks", networkId);
        }
        if (watchProviderId) {
            params.set("with_watch_providers", watchProviderId);
            params.set("watch_region", watchRegion);
        }
        if (watchRegion) {
            params.set("region", watchRegion);
        }
        if (genreId) {
            params.set("with_genres", genreId);
        }
        if (year) {
            if (mediaType === "movie") {
                params.set("primary_release_year", year);
            } else {
                params.set("first_air_date_year", year);
            }
        }
        if (voteAvgGte) {
            params.set("vote_average.gte", voteAvgGte);
        }

        const res = await fetch(
            `${TMDB_BASE}/discover/${mediaType}?${params.toString()}`,
            { next: { revalidate: 3600 } }
        );
        if (!res.ok) throw new Error(`TMDB discover failed: ${res.status}`);
        const data = await res.json();

        return NextResponse.json({
            results: data.results || [],
            total_pages: data.total_pages || 0,
            total_results: data.total_results || 0,
            page: data.page || 1,
        });
    } catch (error) {
        console.error("Discover API error:", error);
        
        // Fallback to local static files
        try {
            let fileName = "popular_movies.json";
            if (networkId) {
                fileName = `network_${networkId}.json`;
            } else if (genreId) {
                const cleanGenre = genreId.replace(/[^0-9,]/g, '');
                if (cleanGenre === '28') fileName = 'genre_action.json';
                else if (cleanGenre === '35') fileName = 'genre_comedy.json';
                else if (cleanGenre === '10749') fileName = 'genre_romance.json';
                else if (cleanGenre.includes('27') || cleanGenre.includes('53')) fileName = 'genre_horror.json';
                else if (cleanGenre === '16') fileName = 'genre_animation.json';
                else if (cleanGenre === '878') fileName = 'genre_scifi.json';
            }
            
            const fallbackUrl = new URL(`/data/${fileName}`, req.url);
            const fallbackRes = await withTimeout(fetch(fallbackUrl), 3000);
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                console.log(`[Discover API] Loaded fallback static file: ${fileName}`);
                return NextResponse.json({
                    results: data.results || [],
                    total_pages: 1,
                    total_results: data.results?.length || 0,
                    page: 1,
                    fromFallback: true
                });
            }
        } catch (fallbackErr: any) {
            console.error("Discover fallback error:", fallbackErr.message);
        }

        return NextResponse.json({ results: [], error: "Failed to fetch" }, { status: 200 });
    }
}
