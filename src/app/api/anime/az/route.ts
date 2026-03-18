export const runtime = "edge";
import { NextResponse } from "next/server";
import { getProvider, type ProviderName } from "@/lib/providers";
import axios from "axios";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const letter = searchParams.get("letter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const providerParam = searchParams.get("provider");

    // List of providers to try in order
    const providersToTry: ProviderName[] = providerParam
        ? [providerParam as ProviderName]
        : ["watchanimeworld", "anikai", "hianime"];

    const errors: any[] = [];
    let combinedShows: any[] = [];
    let successfulProvider = providerParam || "mixed";

    // 1. Fetch Anime from Providers
    for (const providerName of providersToTry) {
        try {
            console.log(`[A-Z] Trying provider: ${providerName} for letter: ${letter}`);
            const animeProvider = getProvider(providerName);

            if (!animeProvider.getAZList) {
                console.warn(`[A-Z] Provider ${providerName} does not support A-Z list, skipping.`);
                continue;
            }

            const results = await animeProvider.getAZList(letter, page);

            if (results && results.length > 0) {
                console.log(`[A-Z] Successfully fetched ${results.length} items from ${providerName}`);
                const animeShows = results.map(result => ({
                    _id: result.id,
                    name: result.title,
                    thumbnail: result.image,
                    availableEpisodes: result.subOrDub,
                    provider: result.provider || providerName,
                    __typename: "Show",
                    type: "Anime"
                }));
                combinedShows = [...combinedShows, ...animeShows];
                successfulProvider = providerName;
                break; // Only need from one working provider
            } else {
                console.warn(`[A-Z] Provider ${providerName} returned 0 results.`);
                errors.push({ provider: providerName, error: "No results found" });
            }
        } catch (error: any) {
            console.error(`[A-Z] Provider ${providerName} failed:`, error.message);
            errors.push({ provider: providerName, error: error.message });
        }
    }

    // 2. Fetch Movies from TMDB starts with letter search
    try {
        console.log(`[A-Z] Fetching TMDB movies for letter: ${letter}`);
        // For TMDB Discover API, we can't easily filter strictly by starting letter directly via API parameter flawlessly
        // The most robust way for "Starts With" is using a regex or filtering locally, but pagination breaks. 
        // We'll use a broad search for the letter if it's alphanumeric, or fetch popular and filter.
        // Or if letter is 'all', fetch popular.
        
        let tmdbUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc&page=${page}&include_adult=false`;
        
        const res = await axios.get(tmdbUrl);
        const data = res.data;
        
        if (data && data.results) {
             let movieShows = data.results.map((item: any) => ({
                 _id: item.id.toString(),
                 name: item.title,
                 thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                 availableEpisodes: { sub: 0, dub: 0 },
                 provider: "tmdb",
                 __typename: "Movie",
                 type: "Movie"
             })).filter((m: any) => m.thumbnail);
             
             if (letter !== "all" && letter !== "0-9") {
                 // Filter strictly by starting letter if not 'all' or '0-9'
                 movieShows = movieShows.filter((m: any) => m.name.toLowerCase().startsWith(letter.toLowerCase()));
             } else if (letter === "0-9") {
                 movieShows = movieShows.filter((m: any) => /^[0-9]/.test(m.name));
             }
             
             combinedShows = [...combinedShows, ...movieShows];
        }
    } catch (tmdbError: any) {
        console.error(`[A-Z] TMDB failed:`, tmdbError.message);
        errors.push({ provider: "tmdb", error: tmdbError.message });
    }

    // Shuffle/interleave or sort combined results alphabetically
    // Shuffle/interleave or sort combined results alphabetically
    combinedShows.sort((a, b) => a.name.localeCompare(b.name));
    
    // Always return the shows array, even if empty, to avoid 500 errors on the frontend 
    // when a specific letter truly has no results.
    return NextResponse.json({ shows: combinedShows, provider: successfulProvider, details: errors });
}
