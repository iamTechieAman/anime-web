import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";
import axios from "axios";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

// Map anime genre names to TMDB genre IDs where possible
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
    "music": 10402,
    "mystery": 9648,
    "romance": 10749,
    "science fiction": 878,
    "sci-fi": 878,
    "tv movie": 10770,
    "thriller": 53,
    "war": 10752,
    "western": 37
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("name") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const provider = (searchParams.get("provider") as ProviderName) || "hianime";

    if (!genre) {
        return NextResponse.json({ error: "Genre name is required" }, { status: 400 });
    }

    let combinedShows: any[] = [];
    let errors: string[] = [];

    // 1. Fetch Anime Genre
    try {
        const animeProvider = getProvider(provider);

        if (animeProvider.getGenre) {
            const results = await animeProvider.getGenre(genre, page);
            const animeShows = results.map(result => ({
                _id: result.id,
                name: result.title,
                thumbnail: result.image,
                availableEpisodes: result.subOrDub,
                provider: provider, // Set explicitly so anime links correctly
                __typename: "Show",
                type: "Anime"
            }));
            combinedShows = [...combinedShows, ...animeShows];
        }
    } catch (error: any) {
        console.error(`[Genre] Provider ${provider} failed:`, error);
        errors.push(`Anime provider failed: ${error.message}`);
    }

    // 2. Fetch TMDB Movie Genre
    try {
        const tmdbGenreId = TMDB_GENRE_MAP[genre.toLowerCase()];
        if (tmdbGenreId) {
             const tmdbUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=${tmdbGenreId}&page=${page}&language=en-US&sort_by=popularity.desc`;
             const res = await axios.get(tmdbUrl);
             
             if (res.data && res.data.results) {
                 const movieShows = res.data.results.map((item: any) => ({
                     _id: item.id.toString(),
                     name: item.title,
                     thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                     availableEpisodes: { sub: 0, dub: 0 },
                     provider: "tmdb",
                     __typename: "Movie",
                     type: "Movie"
                 })).filter((m: any) => m.thumbnail);
                 
                 // Interleave or append
                 combinedShows = [...combinedShows, ...movieShows];
             }
        }
    } catch (tmdbError: any) {
        console.error(`[Genre] TMDB failed:`, tmdbError.message);
        errors.push(`TMDB failed: ${tmdbError.message}`);
    }

    // Shuffle to mix movies and anime if there's > 1 item
    if (combinedShows.length > 1) {
        for (let i = combinedShows.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [combinedShows[i], combinedShows[j]] = [combinedShows[j], combinedShows[i]];
        }
    }

    return NextResponse.json({ shows: combinedShows, errors });
}
