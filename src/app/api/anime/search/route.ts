import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";
import axios from "axios";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

const TMDB_GENRE_MAP: Record<string, number> = {
    "action": 28,
    "adventure": 12,
    "animation": 16,
    "comedy": 35,
    "crime": 80,
    "documentary": 99,
    "drama": 18,
    "family": 10751,
    "fantasy": 14,
    "history": 36,
    "horror": 27,
    "mystery": 9648,
    "romance": 10749,
    "sci-fi": 878,
    "thriller": 53
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const genre = searchParams.get("genre");
    const status = searchParams.get("status");
    const format = searchParams.get("format");
    const requestedProvider = searchParams.get("provider") as ProviderName;

    // Priority: Aniwave (aniwaves.ru) -> AniwatchTV -> HiAnime -> AllAnime -> AniWatch
    const providersToTry: ProviderName[] = requestedProvider
        ? [requestedProvider]
        : ["aniwave", "aniwatchtv", "hianime", "allanime", "aniwatch"];

    if (!query && !genre && !status && !format) {
        return NextResponse.json({ shows: [] });
    }

    try {
        // Search all providers in parallel
        const searchPromises = providersToTry.map(async (provider) => {
            try {
                const animeProvider = getProvider(provider);
                
                let results: any[] = [];
                
                if (query) {
                    results = await animeProvider.search(query);
                } else if (genre && animeProvider.getGenre) {
                    const genreSlug = genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    results = await animeProvider.getGenre(genreSlug);
                } else if (status && animeProvider.getRecent) {
                    results = await animeProvider.getRecent();
                }

                return (results || []).map(result => ({
                    _id: `${provider}:${result.id}`,
                    name: result.title,
                    thumbnail: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || provider,
                    __typename: "Show"
                }));
            } catch (err: any) {
                console.warn(`[Search] ${provider} failed:`, err.message);
                return [];
            }
        });
        
        // Add TMDB Genre Search if genre is provided
        if (genre) {
            const tmdbPromise = (async () => {
                try {
                    const tmdbGenreId = TMDB_GENRE_MAP[genre.toLowerCase()];
                    if (tmdbGenreId) {
                        const tmdbUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=${tmdbGenreId}&page=1&language=en-US&sort_by=popularity.desc`;
                        const res = await axios.get(tmdbUrl);
                        if (res.data && res.data.results) {
                            return res.data.results.map((item: any) => ({
                                _id: `tmdb:${item.id}`,
                                name: item.title,
                                thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
                                availableEpisodes: { sub: 0, dub: 0 },
                                provider: "tmdb",
                                __typename: "Movie",
                                type: "Movie"
                            })).filter((m: any) => m.thumbnail);
                        }
                    }
                } catch (err) {
                    console.warn("[Search] TMDB genre failed:", err);
                }
                return [];
            })();
            searchPromises.push(tmdbPromise);
        }

        const allResults = await Promise.all(searchPromises);

        // Flatten and de-duplicate by ID to provide a clean list that preserves different seasons
        const flattened = allResults.flat();
        const seen = new Set();
        const uniqueShows = flattened.filter(show => {
            const key = show._id || show.name?.toLowerCase().trim() || Math.random().toString();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return NextResponse.json({
            shows: uniqueShows.slice(0, 30), // Limit to top 30 unique results
            count: uniqueShows.length
        }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }
        });

    } catch (error: any) {
        console.error("[Search] Critical failure:", error.message);
        return NextResponse.json({ shows: [] });
    }
}
