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

    // Step 2: Apply episodic validation rules
    if (tvData && !tvData.status_message) {
        // TMDB TV data exists
        const hasSeasons = (tvData.number_of_seasons || 0) > 0;
        const hasEpisodes = (tvData.number_of_episodes || 0) > 1;
        const hasEpisodeRuntime = Array.isArray(tvData.episode_run_time) && tvData.episode_run_time.length > 0;

        if (hasSeasons || hasEpisodes || hasEpisodeRuntime) {
            return { type: "tv", detailsData: tvData };
        }
    }

    // Step 3: Movie fallback
    if (movieData && !movieData.status_message) {
        // Verify it's truly a movie (has runtime but no seasons)
        if (movieData.runtime && !movieData.number_of_seasons) {
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

        const hintType = rawType === "tv" ? "tv" : "movie";

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

        // Fetch supplementary metadata in parallel for the resolved type
        const [creditsRes, videosRes, similarRes, recommendationsRes, keywordsRes, providersRes] = await Promise.all([
            fetchWithTimeout(`${TMDB_BASE}/${type}/${id}/credits?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${type}/${id}/videos?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${type}/${id}/similar?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${type}/${id}/recommendations?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${type}/${id}/keywords?api_key=${TMDB_KEY}`, { next: { revalidate: 86400 } }, 3000),
            fetchWithTimeout(`${TMDB_BASE}/${type}/${id}/watch/providers?api_key=${TMDB_KEY}`, { next: { revalidate: 86400 } }, 3000),
        ]);

        const [credits, videos, similar, recommendations, keywordsData, providersData] = await Promise.all([
            creditsRes.ok ? creditsRes.json() : { cast: [], crew: [] },
            videosRes.ok ? videosRes.json() : { results: [] },
            similarRes.ok ? similarRes.json() : { results: [] },
            recommendationsRes.ok ? recommendationsRes.json() : { results: [] },
            keywordsRes.ok ? keywordsRes.json() : { keywords: [], results: [] },
            providersRes.ok ? providersRes.json() : { results: {} },
        ]);

        // Find trailer
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

        return NextResponse.json({
            ...details,
            resolvedType: type,
            cast: credits.cast?.slice(0, 30) || [],
            crew: credits.crew?.slice(0, 10) || [],
            trailer: trailer ? { key: trailer.key, name: trailer.name, site: trailer.site } : null,
            similar: similar.results?.slice(0, 12) || [],
            recommendations: recommendations.results?.slice(0, 12) || [],
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
