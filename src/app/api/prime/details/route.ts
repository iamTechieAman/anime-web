import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TVMAZE_BASE = "https://api.tvmaze.com";

/**
 * Universal Content Resolver (UCR)
 * Priority: TMDB (primary) → TVMaze (cross-validation)
 * Rules:
 *   - If TMDB returns seasons > 0 or number_of_episodes > 1 → type=tv
 *   - If only runtime is available → type=movie
 *   - Query TV and Movie in parallel when type is ambiguous
 *   - Cross-validate with TVMaze for episodic content detection
 *   - Never trust the raw `type` param blindly
 */
async function resolveContentType(
    id: string,
    hintType: string
): Promise<{ type: string; detailsData: any }> {
    // Step 1: Fetch both TV and Movie TMDB details in parallel
    const [tvRes, movieRes] = await Promise.all([
        fetchWithTimeout(`${TMDB_BASE}/tv/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000),
        fetchWithTimeout(`${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000),
    ]);

    const tvData = tvRes.ok ? await tvRes.json() : null;
    const movieData = movieRes.ok ? await movieRes.json() : null;

    // Step 2: Apply episodic & anime validation rules
    // 1. Anime Detection (Animation + JP original language/country)
    if (tvData && !tvData.status_message) {
        const isJp = tvData.original_language === "ja" || (Array.isArray(tvData.origin_country) && tvData.origin_country.includes("JP")) || tvData.origin_country === "JP";
        const genres = tvData.genres || [];
        const isAnimation = Array.isArray(genres) && genres.some((g: any) => g.id === 16 || g.name === "Animation");
        if (isJp && isAnimation) {
            return { type: "anime", detailsData: tvData };
        }
    }
    if (movieData && !movieData.status_message) {
        const isJp = movieData.original_language === "ja" || (Array.isArray(movieData.origin_country) && movieData.origin_country.includes("JP")) || movieData.origin_country === "JP";
        const genres = movieData.genres || [];
        const isAnimation = Array.isArray(genres) && genres.some((g: any) => g.id === 16 || g.name === "Animation");
        if (isJp && isAnimation) {
            return { type: "anime", detailsData: movieData };
        }
    }

    // 2. TV Series (seasons present, episodes present)
    if (tvData && !tvData.status_message) {
        const hasSeasons = (tvData.number_of_seasons || 0) > 0 || (Array.isArray(tvData.seasons) && tvData.seasons.length > 0);
        const hasEpisodes = (tvData.number_of_episodes || 0) > 0;
        if (hasSeasons || hasEpisodes) {
            return { type: "tv", detailsData: tvData };
        }
    }

    // 3. Movie (runtime exists, episodes absent, seasons absent)
    if (movieData && !movieData.status_message) {
        const hasRuntime = (movieData.runtime || 0) > 0;
        const episodesAbsent = !movieData.number_of_episodes;
        const seasonsAbsent = !movieData.number_of_seasons;
        if (hasRuntime && episodesAbsent && seasonsAbsent) {
            return { type: "movie", detailsData: movieData };
        }
    }

    // Step 4: Honor the hint if both endpoints returned valid data
    if (hintType === "tv" && tvData && !tvData.status_message) {
        return { type: "tv", detailsData: tvData };
    }
    if (movieData && !movieData.status_message) {
        return { type: "movie", detailsData: movieData };
    }
    if (tvData && !tvData.status_message) {
        return { type: "tv", detailsData: tvData };
    }

    throw new Error("Content not found on TMDB for either tv or movie type.");
}

/**
 * TVMaze cross-validation: confirms if content is episodic via title search.
 * Returns true if TVMaze finds a series match, false otherwise.
 */
async function tvmazeCrossValidate(title: string): Promise<boolean> {
    try {
        const encoded = encodeURIComponent(title);
        const res = await fetchWithTimeout(`${TVMAZE_BASE}/singlesearch/shows?q=${encoded}`, {
            next: { revalidate: 7200 },
        }, 3000);

        if (!res.ok) return false;
        const data = await res.json();
        // If TVMaze found a show, it's episodic TV
        return !!(data && data.id);
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const rawType = searchParams.get("type") || "movie";

        if (!id || id === "undefined" || id === "null" || isNaN(Number(id))) {
            return NextResponse.json({ error: "Missing or invalid id parameter" }, { status: 400 });
        }

        // Normalize hintType — TMDB does not have an 'anime' type; map it to 'tv'
        const hintType = (rawType === "tv" || rawType === "anime") ? "tv" : "movie";

        // Resolve content type using Universal Content Resolver
        let { type, detailsData: details } = await resolveContentType(id, hintType);

        // TVMaze cross-validation for movies that might actually be series
        if (type === "movie" && details?.title) {
            const isEpisodic = await tvmazeCrossValidate(details.title);
            if (isEpisodic) {
                // Re-fetch as TV if TVMaze confirms it's a series
                const tvRes = await fetchWithTimeout(`${TMDB_BASE}/tv/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000);
                if (tvRes.ok) {
                    const tvData = await tvRes.json();
                    if (!tvData.status_message) {
                        type = "tv";
                        details = tvData;
                    }
                }
            }
        }

        // Map resolved type to valid TMDB type for supplementary metadata calls
        // TMDB only supports 'tv' and 'movie' — never 'anime', 'cartoon', etc.
        const tmdbType = type === "movie" ? "movie" : "tv";

        // Fetch supplementary metadata in parallel for the resolved type
        const [creditsRes, videosRes, similarRes, recommendationsRes, keywordsRes, providersRes] = await Promise.all([
            fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/credits?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/videos?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/similar?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }, 3000),
            // Replaced basic recommendations with advanced filtered discover API in the next step
            fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/recommendations?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/keywords?api_key=${TMDB_KEY}`, { next: { revalidate: 86400 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/watch/providers?api_key=${TMDB_KEY}`, { next: { revalidate: 86400 } }, 3000),
        ]);

        const [credits, videos, similar, recommendations, keywordsData, providersData] = await Promise.all([
            creditsRes.ok ? creditsRes.json() : { cast: [], crew: [] },
            videosRes.ok ? videosRes.json() : { results: [] },
            similarRes.ok ? similarRes.json() : { results: [] },
            recommendationsRes.ok ? recommendationsRes.json() : { results: [] },
            keywordsRes.ok ? keywordsRes.json() : { keywords: [], results: [] },
            providersRes.ok ? providersRes.json() : { results: {} },
        ]);

        // Extract keys for advanced discover recommendations
        const originalLanguage = details.original_language || "en";
        const primaryGenre = details.genres?.[0]?.id || "";
        const productionCompany = details.production_companies?.[0]?.id || "";
        const parsedKeywords = keywordsData.keywords || keywordsData.results || [];
        const topKeyword = parsedKeywords[0]?.id || "";

        // Smart Recommendations: Filter by language, genre, and franchise vibe
        let smartRecommendations = recommendations.results || [];
        
        if (smartRecommendations.length < 5) {
            try {
                let discoverUrl = `${TMDB_BASE}/discover/${tmdbType}?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc&page=1&with_original_language=${originalLanguage}`;
                if (primaryGenre) discoverUrl += `&with_genres=${primaryGenre}`;
                if (topKeyword) discoverUrl += `&with_keywords=${topKeyword}`;
                
                const discoverRes = await fetchWithTimeout(discoverUrl, { next: { revalidate: 86400 } }, 3000);
                if (discoverRes.ok) {
                    const discoverData = await discoverRes.json();
                    if (discoverData.results) {
                        smartRecommendations = [...smartRecommendations, ...discoverData.results].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i && v.id !== Number(id));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch smart recommendations", e);
            }
        }
        const trailer = videos.results?.find(
            (v: any) => v.type === "Trailer" && v.site === "YouTube"
        ) || videos.results?.[0];

        // Normalize keywords (movies use 'keywords', TV uses 'results')
        const keywords: { id: number; name: string }[] = keywordsData.keywords || keywordsData.results || [];

        // Extract US watch providers (or first available country)
        const providerResults = providersData.results || {};
        const usProviders = providerResults['US'] || Object.values(providerResults)[0] || {};
        const watchProviders = [
            ...(usProviders.flatrate || []),
            ...(usProviders.free || []),
            ...(usProviders.ads || []),
        ].slice(0, 8);

        // Normalize TV Show Runtime vs Movie Runtime
        if (type === "tv" || type === "anime") {
            // TV Shows should not have a total movie-like runtime
            if (details.episode_run_time && details.episode_run_time.length > 0) {
                details.episode_runtime = details.episode_run_time[0];
            } else if (details.runtime) {
                // If TMDB improperly returned 'runtime' for a TV show, treat it as episode runtime
                details.episode_runtime = details.runtime;
            }
        }

        return NextResponse.json({
            ...details,
            resolvedType: type,
            cast: credits.cast?.slice(0, 30) || [],
            crew: credits.crew?.slice(0, 10) || [],
            trailer: trailer ? { key: trailer.key, name: trailer.name, site: trailer.site } : null,
            similar: similar.results?.slice(0, 12) || [],
            recommendations: smartRecommendations.slice(0, 12),
            keywords,
            watch_providers: watchProviders,
        }, {
            headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' }
        });
    } catch (error: any) {
        console.error("Details API error:", error?.message || error);
        return NextResponse.json(
            { error: "Failed to fetch details", message: error?.message },
            { status: 500 }
        );
    }
}
