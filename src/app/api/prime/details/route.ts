import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TVMAZE_BASE = "https://api.tvmaze.com";

/**
 * Universal Content Resolver (UCR)
 * Priority: Requested hint endpoint -> Alternate endpoint fallback
 * Rules:
 *   - If requested as 'movie' and /movie/{id} returns valid data -> type=movie
 *   - If requested as 'tv' and /tv/{id} returns valid data -> type=tv
 *   - If primary endpoint 404s, try fallback endpoint
 *   - Never infer type from title text or language flags
 */
async function resolveContentType(
    id: string,
    hintType: "movie" | "tv"
): Promise<{ type: "movie" | "tv"; detailsData: any }> {
    const primaryUrl = `${TMDB_BASE}/${hintType}/${id}?api_key=${TMDB_KEY}&language=en-US`;
    const alternateType: "movie" | "tv" = hintType === "movie" ? "tv" : "movie";
    const alternateUrl = `${TMDB_BASE}/${alternateType}/${id}?api_key=${TMDB_KEY}&language=en-US`;

    // Try primary requested type first
    try {
        const res = await fetchWithTimeout(primaryUrl, { next: { revalidate: 3600 } }, 3000);
        if (res.ok) {
            const data = await res.json();
            if (data && !data.status_message && data.id) {
                return { type: hintType, detailsData: data };
            }
        }
    } catch (e) {}

    // Fallback to alternate type only if primary failed
    try {
        const altRes = await fetchWithTimeout(alternateUrl, { next: { revalidate: 3600 } }, 3000);
        if (altRes.ok) {
            const altData = await altRes.json();
            if (altData && !altData.status_message && altData.id) {
                return { type: alternateType, detailsData: altData };
            }
        }
    } catch (e) {}

    throw new Error(`Content not found on TMDB for ID ${id}`);
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const rawType = (searchParams.get("type") || "movie").toLowerCase();

        if (!id || id === "undefined" || id === "null" || isNaN(Number(id))) {
            return NextResponse.json({ error: "Missing or invalid id parameter" }, { status: 400 });
        }

        // Normalize hintType: strictly 'movie' or 'tv'
        const hintType: "movie" | "tv" = (rawType === "tv" || rawType === "series" || rawType === "show") ? "tv" : "movie";

        // Resolve content type
        let { type, detailsData: details } = await resolveContentType(id, hintType);

        // Map resolved type to valid TMDB type for supplementary metadata calls
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
