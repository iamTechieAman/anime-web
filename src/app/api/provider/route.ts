import { NextResponse } from "next/server";

const TMDB_KEY = process.env.TMDB_API_KEY || "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

// Real TMDB watch provider IDs + network IDs
const PROVIDER_MAP: Record<
    string,
    {
        watchProviderId: number | null;
        networkId: string | null;
        label: string;
        isAnime?: boolean;
    }
> = {
    netflix: { watchProviderId: 8, networkId: "213", label: "Netflix" },
    prime: { watchProviderId: 9, networkId: "1024", label: "Prime Video" },
    disney: { watchProviderId: 337, networkId: "2739", label: "Disney+" },
    crunchyroll: { watchProviderId: 283, networkId: "1112", label: "Crunchyroll", isAnime: true },
    hulu: { watchProviderId: 15, networkId: "453", label: "Hulu" },
    hbo: { watchProviderId: 1899, networkId: "49", label: "HBO Max" },
    appletv: { watchProviderId: 350, networkId: "2552", label: "Apple TV+" },
    toonplayer: { watchProviderId: null, networkId: null, label: "ToonPlayer Originals", isAnime: true },
    paramount: { watchProviderId: 531, networkId: "4330", label: "Paramount+" },
    peacock: { watchProviderId: 386, networkId: "3353", label: "Peacock" },
};

async function fetchTMDB(url: string) {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return { results: [], total_pages: 0, total_results: 0, page: 1 };
    return res.json();
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const providerSlug = searchParams.get("provider") || "netflix";
        const page = searchParams.get("page") || "1";
        const section = searchParams.get("section") || "all"; // all | trending | movies | tv | toprated

        const provider = PROVIDER_MAP[providerSlug];
        if (!provider) {
            return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
        }

        // For anime-first providers (Crunchyroll, ToonPlayer), return anime data
        if (provider.isAnime) {
            if (providerSlug === "crunchyroll") {
                // Crunchyroll: use TMDB anime/animation genre + Crunchyroll watch provider
                const [moviesData, tvData] = await Promise.allSettled([
                    fetchTMDB(
                        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&language=en-US&page=${page}&with_watch_providers=283&watch_region=US&with_genres=16&sort_by=popularity.desc&vote_count.gte=50`
                    ),
                    fetchTMDB(
                        `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&language=en-US&page=${page}&with_watch_providers=283&watch_region=US&with_genres=16&sort_by=popularity.desc&vote_count.gte=50`
                    ),
                ]);

                const movies = moviesData.status === "fulfilled" ? moviesData.value.results || [] : [];
                const tv = tvData.status === "fulfilled" ? tvData.value.results || [] : [];

                return NextResponse.json({
                    provider: providerSlug,
                    label: provider.label,
                    isAnime: true,
                    trending: [...tv.slice(0, 10), ...movies.slice(0, 5)],
                    movies: movies.filter((i: any) => i?.poster_path),
                    tv: tv.filter((i: any) => i?.poster_path),
                    topRated: [...tv, ...movies]
                        .filter((i: any) => i?.poster_path && i?.vote_average > 7)
                        .sort((a: any, b: any) => b.vote_average - a.vote_average)
                        .slice(0, 20),
                    popular: tv.filter((i: any) => i?.poster_path).slice(0, 20),
                });
            }

            // ToonPlayer Originals — return broad anime/animation from TMDB
            const [animeMovies, animeTv] = await Promise.allSettled([
                fetchTMDB(
                    `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&language=en-US&page=${page}&with_genres=16&sort_by=popularity.desc&vote_count.gte=100`
                ),
                fetchTMDB(
                    `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&language=en-US&page=${page}&with_genres=16&sort_by=popularity.desc&vote_count.gte=50`
                ),
            ]);

            const movies = animeMovies.status === "fulfilled" ? animeMovies.value.results || [] : [];
            const tv = animeTv.status === "fulfilled" ? animeTv.value.results || [] : [];

            return NextResponse.json({
                provider: providerSlug,
                label: provider.label,
                isAnime: true,
                trending: [...tv.slice(0, 8), ...movies.slice(0, 5)],
                movies: movies.filter((i: any) => i?.poster_path),
                tv: tv.filter((i: any) => i?.poster_path),
                topRated: [...tv, ...movies]
                    .filter((i: any) => i?.poster_path && i?.vote_average > 7.5)
                    .sort((a: any, b: any) => b.vote_average - a.vote_average)
                    .slice(0, 20),
                popular: tv.filter((i: any) => i?.poster_path).slice(0, 20),
            });
        }

        // Standard providers: build TMDB discover params
        const watchProviderId = provider.watchProviderId;
        const networkId = provider.networkId;

        // Build base params for watch providers
        const movieParams = new URLSearchParams({
            api_key: TMDB_KEY,
            language: "en-US",
            page,
            sort_by: "popularity.desc",
            "vote_count.gte": "30",
            include_adult: "false",
        });

        const tvParams = new URLSearchParams({
            api_key: TMDB_KEY,
            language: "en-US",
            page,
            sort_by: "popularity.desc",
            "vote_count.gte": "20",
            include_adult: "false",
        });

        const tvTopRatedParams = new URLSearchParams({
            api_key: TMDB_KEY,
            language: "en-US",
            page,
            sort_by: "vote_average.desc",
            "vote_count.gte": "100",
            include_adult: "false",
        });

        // Apply provider filters
        if (watchProviderId) {
            movieParams.set("with_watch_providers", String(watchProviderId));
            movieParams.set("watch_region", "US");
            tvParams.set("with_watch_providers", String(watchProviderId));
            tvParams.set("watch_region", "US");
            tvTopRatedParams.set("with_watch_providers", String(watchProviderId));
            tvTopRatedParams.set("watch_region", "US");
        }

        if (networkId) {
            tvParams.set("with_networks", networkId);
            tvTopRatedParams.set("with_networks", networkId);
        }

        // Fetch all sections in parallel
        const [moviesData, tvData, tvTopRatedData, movieTopRatedData] = await Promise.allSettled([
            fetchTMDB(`${TMDB_BASE}/discover/movie?${movieParams}`),
            fetchTMDB(`${TMDB_BASE}/discover/tv?${tvParams}`),
            fetchTMDB(`${TMDB_BASE}/discover/tv?${tvTopRatedParams}`),
            fetchTMDB(
                `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&language=en-US&page=${page}&sort_by=vote_average.desc&vote_count.gte=200&with_watch_providers=${watchProviderId}&watch_region=US`
            ),
        ]);

        const movies = (moviesData.status === "fulfilled" ? moviesData.value.results || [] : []).filter(
            (i: any) => i?.poster_path || i?.backdrop_path
        );
        const tv = (tvData.status === "fulfilled" ? tvData.value.results || [] : []).filter(
            (i: any) => i?.poster_path || i?.backdrop_path
        );
        const tvTopRated = (tvTopRatedData.status === "fulfilled" ? tvTopRatedData.value.results || [] : []).filter(
            (i: any) => i?.poster_path || i?.backdrop_path
        );
        const movieTopRated = (movieTopRatedData.status === "fulfilled" ? movieTopRatedData.value.results || [] : []).filter(
            (i: any) => i?.poster_path || i?.backdrop_path
        );

        // Build a combined trending from most popular of movies + tv
        const trending = [...tv.slice(0, 8), ...movies.slice(0, 7)]
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 20);

        const topRated = [...tvTopRated.slice(0, 10), ...movieTopRated.slice(0, 10)].sort(
            (a: any, b: any) => b.vote_average - a.vote_average
        );

        return NextResponse.json(
            {
                provider: providerSlug,
                label: provider.label,
                isAnime: false,
                trending,
                movies,
                tv,
                topRated,
                popular: [...movies.slice(0, 10), ...tv.slice(0, 10)],
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
                },
            }
        );
    } catch (error: any) {
        console.error("Provider API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch provider content", results: [] },
            { status: 500 }
        );
    }
}
