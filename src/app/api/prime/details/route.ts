import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { animeCache, TTL, cacheKey } from "@/lib/anime-cache";
import { TwoEmbedProvider } from "@/lib/providers/twoembed";

const twoEmbed = new TwoEmbedProvider();
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

async function getOfflineFallbackDetails(id: string, hintType: "movie" | "tv") {
    try {
        const dataDir = path.join(process.cwd(), "public", "data");
        const filesToSearch = hintType === "tv"
            ? ["popular_tv.json", "tv_popular.json", "tv_top_rated.json", "trending_all.json"]
            : ["popular_movies.json", "top_rated_movies.json", "trending_movies.json", "trending_all.json"];
        
        for (const file of filesToSearch) {
            try {
                const filePath = path.join(dataDir, file);
                const content = await fs.readFile(filePath, "utf-8");
                const parsed = JSON.parse(content);
                const found = parsed.results?.find((item: any) => String(item.id) === String(id));
                if (found) {
                    const isTv = hintType === "tv" || Boolean(found.name && !found.title);
                    return {
                        type: isTv ? ("tv" as const) : ("movie" as const),
                        detailsData: {
                            ...found,
                            title: found.title || found.name,
                            name: found.name || found.title,
                            number_of_seasons: found.number_of_seasons || (isTv ? 4 : undefined),
                            number_of_episodes: found.number_of_episodes || (isTv ? 40 : undefined),
                            seasons: isTv ? (found.seasons || [
                                { id: 101, season_number: 1, name: "Season 1", episode_count: 10 },
                                { id: 102, season_number: 2, name: "Season 2", episode_count: 10 },
                                { id: 103, season_number: 3, name: "Season 3", episode_count: 10 },
                                { id: 104, season_number: 4, name: "Season 4", episode_count: 10 },
                            ]) : undefined,
                        }
                    };
                }
            } catch (_) {}
        }
    } catch (_) {}
    return null;
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
        const cKey = cacheKey.tmdbDetails(id, hintType);

        // Instant Cache Hit (0.01s load time)
        const cached = animeCache.get(cKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', 'X-Cache': 'HIT' }
            });
        }

        // Resolve content type: live TMDB first, then offline static catalog fallback
        let resolved = null;
        let isFallback = false;
        try {
            resolved = await resolveContentType(id, hintType);
        } catch (tmdbErr) {
            console.warn(`[Details API] Online TMDB fetch failed for ${id}, checking optional 2Embed provider:`, (tmdbErr as any)?.message);
            // 1. Try verified 2Embed metadata provider
            try {
                const twoEmbedData = hintType === "tv"
                    ? await twoEmbed.getTvDetails({ tmdbId: id })
                    : await twoEmbed.getMovieDetails({ tmdbId: id });

                if (twoEmbedData) {
                    resolved = {
                        type: twoEmbedData.media_type,
                        detailsData: {
                            ...twoEmbedData,
                            number_of_seasons: (twoEmbedData as any).number_of_seasons,
                            number_of_episodes: (twoEmbedData as any).number_of_episodes,
                            seasons: (twoEmbedData as any).seasons,
                        }
                    };
                    isFallback = true;
                }
            } catch (twoEmbedErr) {
                console.warn(`[Details API] 2Embed metadata fetch failed for ${id}:`, (twoEmbedErr as any)?.message);
            }

            // 2. If 2Embed unavailable or empty, fall back to offline static catalog
            if (!resolved) {
                console.warn(`[Details API] Checking offline static catalog for ${id}`);
                resolved = await getOfflineFallbackDetails(id, hintType);
            }

            if (!resolved) throw tmdbErr;
            isFallback = true;
        }

        let { type, detailsData: details } = resolved;

        // Map resolved type to valid TMDB type for supplementary metadata calls
        const tmdbType = type === "movie" ? "movie" : "tv";

        let credits: any = { cast: [], crew: [] };
        let videos: any = { results: [] };
        let similar: any = { results: [] };
        let recommendations: any = { results: [] };
        let keywordsData: any = { keywords: [], results: [] };
        let providersData: any = { results: {} };

        if (!isFallback) {
            try {
                const [creditsRes, videosRes, similarRes, recommendationsRes, keywordsRes, providersRes] = await Promise.all([
                    fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/credits?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000).catch(() => ({ ok: false } as any)),
                    fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/videos?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }, 3000).catch(() => ({ ok: false } as any)),
                    fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/similar?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }, 3000).catch(() => ({ ok: false } as any)),
                    fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/recommendations?api_key=${TMDB_KEY}&language=en-US&page=1`, { next: { revalidate: 3600 } }, 3000).catch(() => ({ ok: false } as any)),
                    fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/keywords?api_key=${TMDB_KEY}`, { next: { revalidate: 86400 } }, 3000).catch(() => ({ ok: false } as any)),
                    fetchWithTimeout(`${TMDB_BASE}/${tmdbType}/${id}/watch/providers?api_key=${TMDB_KEY}`, { next: { revalidate: 86400 } }, 3000).catch(() => ({ ok: false } as any)),
                ]);

                [credits, videos, similar, recommendations, keywordsData, providersData] = await Promise.all([
                    creditsRes.ok ? creditsRes.json().catch(() => ({ cast: [], crew: [] })) : { cast: [], crew: [] },
                    videosRes.ok ? videosRes.json().catch(() => ({ results: [] })) : { results: [] },
                    similarRes.ok ? similarRes.json().catch(() => ({ results: [] })) : { results: [] },
                    recommendationsRes.ok ? recommendationsRes.json().catch(() => ({ results: [] })) : { results: [] },
                    keywordsRes.ok ? keywordsRes.json().catch(() => ({ keywords: [], results: [] })) : { keywords: [], results: [] },
                    providersRes.ok ? providersRes.json().catch(() => ({ results: {} })) : { results: {} },
                ]);
            } catch (err) {
                console.warn('[Details API] Supplementary metadata fetch bypassed:', err);
            }
        }

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
        if (type === "tv") {
            // TV Shows should not have a total movie-like runtime
            if (details.episode_run_time && details.episode_run_time.length > 0) {
                details.episode_runtime = details.episode_run_time[0];
            } else if (details.runtime) {
                // If TMDB improperly returned 'runtime' for a TV show, treat it as episode runtime
                details.episode_runtime = details.runtime;
            }
        }

        let finalTrailer = trailer ? { key: trailer.key, name: trailer.name, site: trailer.site } : null;
        if (!finalTrailer && typeof details.trailer === 'string') {
            const ytMatch = details.trailer.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch) {
                finalTrailer = { key: ytMatch[1], name: "Official Trailer", site: "YouTube" };
            }
        }

        const normalizedCast = credits.cast?.length
            ? credits.cast.slice(0, 30)
            : (Array.isArray(details.cast) ? details.cast.slice(0, 30).map((c: any) => typeof c === 'string' ? { name: c, character: '' } : c) : []);

        const normalizedCrew = credits.crew?.length
            ? credits.crew.slice(0, 10)
            : (Array.isArray(details.crew) ? details.crew.slice(0, 10).map((c: any) => typeof c === 'string' ? { name: c, job: 'Crew' } : c) : []);

        const normalizedSimilar = (similar.results?.length
            ? similar.results
            : (Array.isArray(details.similar) ? details.similar : [])
        ).slice(0, 12);

        const finalPayload = {
            ...details,
            resolvedType: type,
            cast: normalizedCast,
            crew: normalizedCrew,
            trailer: finalTrailer,
            similar: normalizedSimilar,
            recommendations: smartRecommendations.slice(0, 12),
            keywords,
            watch_providers: watchProviders,
        };

        // Cache for 30 minutes in memory
        animeCache.set(cKey, finalPayload, TTL.TMDB_DETAILS);

        return NextResponse.json(finalPayload, {
            headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', 'X-Cache': 'MISS' }
        });
    } catch (error: any) {
        console.error("Details API error:", error?.message || error);
        return NextResponse.json(
            { error: "Failed to fetch details", message: error?.message },
            { status: 500 }
        );
    }
}
