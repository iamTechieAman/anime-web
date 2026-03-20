import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

// Helper: wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout`)), ms))
    ]);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const letter = searchParams.get("letter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const providerParam = searchParams.get("provider");
    const tab = searchParams.get("tab") || "everything"; // everything, movies, anime

    const errors: any[] = [];
    let animeShows: any[] = [];
    let movieShows: any[] = [];

    // 1. Fetch Anime from Providers (skip if tab is "movies")
    if (tab !== "movies") {
        const providersToTry: ProviderName[] = providerParam
            ? [providerParam as ProviderName]
            : ["anikai", "hianime"];

        for (const providerName of providersToTry) {
            try {
                console.log(`[A-Z] Trying anime provider: ${providerName} for letter: ${letter}`);
                const animeProvider = getProvider(providerName);

                if (!animeProvider.getAZList) continue;

                const results = await withTimeout(animeProvider.getAZList(letter, page), 8000);

                if (results && results.length > 0) {
                    console.log(`[A-Z] Got ${results.length} anime from ${providerName}`);
                    animeShows = results.map(result => ({
                        _id: result.id,
                        name: result.title,
                        thumbnail: result.image,
                        availableEpisodes: result.subOrDub,
                        provider: result.provider || providerName,
                        __typename: "Show",
                        type: "Anime"
                    }));
                    break;
                }
            } catch (error: any) {
                console.error(`[A-Z] Anime provider ${providerName} failed:`, error.message);
                errors.push({ provider: providerName, error: error.message });
            }
        }
    }

    // 2. Fetch Movies/TV from TMDB (skip if tab is "anime")
    if (tab !== "anime") {
        try {
            console.log(`[A-Z] Fetching TMDB content for letter: ${letter}`);

            // Use search API for specific letters, discover for "all"
            if (letter === "all") {
                // Fetch popular movies + TV
                const [movieRes, tvRes] = await Promise.all([
                    fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=${page}`),
                    fetch(`${TMDB_BASE}/tv/popular?api_key=${TMDB_KEY}&language=en-US&page=${page}`)
                ]);

                const [movieData, tvData] = await Promise.all([
                    movieRes.ok ? movieRes.json() : { results: [] },
                    tvRes.ok ? tvRes.json() : { results: [] }
                ]);

                const movies = (movieData.results || []).map((item: any) => ({
                    _id: `tmdb:movie:${item.id}`,
                    name: item.title,
                    thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                    availableEpisodes: { sub: 0, dub: 0 },
                    provider: "tmdb",
                    __typename: "Movie",
                    type: "Movie",
                    rating: item.vote_average?.toFixed(1)
                })).filter((m: any) => m.thumbnail);

                const tvShows = (tvData.results || []).map((item: any) => ({
                    _id: `tmdb:tv:${item.id}`,
                    name: item.name,
                    thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                    availableEpisodes: { sub: 0, dub: 0 },
                    provider: "tmdb",
                    __typename: "Show",
                    type: "TV Show",
                    rating: item.vote_average?.toFixed(1)
                })).filter((m: any) => m.thumbnail);

                movieShows = [...movies, ...tvShows];
            } else {
                // Use search API with the letter as query — returns relevant results
                const searchLetter = letter === "0-9" ? "1" : letter;
                const [movieRes, tvRes] = await Promise.all([
                    fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=en-US&query=${encodeURIComponent(searchLetter)}&page=${page}&include_adult=false`),
                    fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&language=en-US&query=${encodeURIComponent(searchLetter)}&page=${page}&include_adult=false`)
                ]);

                const [movieData, tvData] = await Promise.all([
                    movieRes.ok ? movieRes.json() : { results: [] },
                    tvRes.ok ? tvRes.json() : { results: [] }
                ]);

                const movies = (movieData.results || [])
                    .filter((item: any) => {
                        if (letter === "0-9") return /^[0-9]/.test(item.title || "");
                        return (item.title || "").toLowerCase().startsWith(letter.toLowerCase());
                    })
                    .map((item: any) => ({
                        _id: `tmdb:movie:${item.id}`,
                        name: item.title,
                        thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                        availableEpisodes: { sub: 0, dub: 0 },
                        provider: "tmdb",
                        __typename: "Movie",
                        type: "Movie",
                        rating: item.vote_average?.toFixed(1)
                    })).filter((m: any) => m.thumbnail);

                const tvShows = (tvData.results || [])
                    .filter((item: any) => {
                        if (letter === "0-9") return /^[0-9]/.test(item.name || "");
                        return (item.name || "").toLowerCase().startsWith(letter.toLowerCase());
                    })
                    .map((item: any) => ({
                        _id: `tmdb:tv:${item.id}`,
                        name: item.name,
                        thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                        availableEpisodes: { sub: 0, dub: 0 },
                        provider: "tmdb",
                        __typename: "Show",
                        type: "TV Show",
                        rating: item.vote_average?.toFixed(1)
                    })).filter((m: any) => m.thumbnail);

                movieShows = [...movies, ...tvShows];
            }
        } catch (tmdbError: any) {
            console.error(`[A-Z] TMDB failed:`, tmdbError.message);
            errors.push({ provider: "tmdb", error: tmdbError.message });
        }
    }

    // 3. Combine and sort
    const combinedShows = [...animeShows, ...movieShows].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
        shows: combinedShows,
        animeCount: animeShows.length,
        movieCount: movieShows.length,
        details: errors
    });
}
