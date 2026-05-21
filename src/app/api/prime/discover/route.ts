import { NextResponse } from "next/server";

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
    const watchProviderId = searchParams.get("watch_provider_id");
    const watchRegion = searchParams.get("watch_region") || "US";

    try {
        const params = new URLSearchParams({
            api_key: TMDB_KEY,
            language: "en-US",
            page,
            sort_by: sortBy,
            "vote_count.gte": "50",
            include_adult: "false",
        });

        if (networkId && mediaType === "tv") {
            params.set("with_networks", networkId);
        }
        if (watchProviderId) {
            params.set("with_watch_providers", watchProviderId);
            params.set("watch_region", watchRegion);
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
        const data = await res.json();

        return NextResponse.json({
            results: data.results || [],
            total_pages: data.total_pages || 0,
            total_results: data.total_results || 0,
            page: data.page || 1,
        });
    } catch (error) {
        console.error("Discover API error:", error);
        return NextResponse.json({ results: [], error: "Failed to fetch" }, { status: 500 });
    }
}
