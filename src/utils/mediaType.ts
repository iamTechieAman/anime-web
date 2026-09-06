/**
 * Canonical Content Classification & Normalization System for ToonPlayer
 * 
 * Strictly distinguishes MOVIE, SERIES (TV), and ANIME across the entire application.
 * Ensures movie playback never uses episode logic and series playback never uses movie logic.
 */

export type CanonicalMediaType = "movie" | "tv" | "anime";

export interface CanonicalContent {
    id: string;
    showId: string;
    title: string;
    mediaType: CanonicalMediaType;
    isMovie: boolean;
    isSeries: boolean;
    isAnime: boolean;
    poster: string | null;
    backdrop: string | null;
    year: string | null;
    rating: number | null;
    duration?: number;
    season?: number;
    episode?: number | string;
    watchHref: string;
}

/**
 * Normalizes provider or external raw type strings into canonical "movie" | "tv" | "anime"
 */
export function normalizeContentType(rawType: any): CanonicalMediaType {
    if (!rawType || typeof rawType !== "string") return "movie";
    const clean = rawType.toLowerCase().trim();

    // Movie aliases
    if (clean === "movie" || clean === "film" || clean === "movie film" || clean === "feature" || clean === "cinema") {
        return "movie";
    }

    // TV / Series aliases
    if (clean === "tv" || clean === "tv series" || clean === "tv_series" || clean === "series" || clean === "tvshow" || clean === "show" || clean === "drama" || clean === "serial") {
        return "tv";
    }

    // Anime aliases
    if (clean === "anime" || clean === "ova" || clean === "ona" || clean === "special") {
        return "anime";
    }

    return "movie";
}

/**
 * Canonical media type detector.
 * Strictly uses verified metadata signals instead of guessing or title string matching.
 */
export function detectMediaType(item: any): CanonicalMediaType {
    if (!item) return "movie";

    // 0. Explicit prefix checks on ID (Highest Reliability)
    const rawId = String(item.id || item._id || item.showId || "");
    if (rawId.startsWith("tmdb:movie:")) return "movie";
    if (rawId.startsWith("tmdb:tv:")) return "tv";
    if (rawId.startsWith("hi:") || rawId.startsWith("aw:") || rawId.startsWith("anikai:") || rawId.startsWith("anilist:")) {
        return "anime";
    }

    // 1. Explicit normalized media type
    const explicitType = item.media_type || item.type || item.contentType;
    if (explicitType) {
        const normalized = normalizeContentType(explicitType);
        // If explicit type is "anime", check if it's an AniList/provider item
        if (normalized === "anime" || item.anilistId || item.malId) {
            return "anime";
        }
        if (normalized === "tv" || normalized === "movie") {
            return normalized;
        }
    }

    // 2. Anime Provider check
    const provider = (item.provider || rawId.split(":")?.[0] || "").toLowerCase();
    if (provider && ["hianime", "aniwatch", "allanime", "hianime_fallback", "anikai", "aniwave", "aniwatchtv", "cinevo", "consumet", "gogoanime", "animepahe", "jikan", "hi", "aw"].includes(provider)) {
        return "anime";
    }

    // 3. AniList / MAL metadata presence
    if (item.anilistId || item.anilist_id || item.aniListId || item.malId || item.mal_id) {
        return "anime";
    }

    // 4. TV Series structural signals (seasons/episodes present)
    const hasSeasons = (typeof item.number_of_seasons === "number" && item.number_of_seasons > 0) ||
                       (Array.isArray(item.seasons) && item.seasons.length > 0) ||
                       item.season !== undefined;
                       
    const hasEpisodes = (typeof item.number_of_episodes === "number" && item.number_of_episodes > 0) ||
                        (Array.isArray(item.episodes) && item.episodes.length > 0) ||
                        (item.availableEpisodes && typeof item.availableEpisodes === "object") ||
                        item.episodeNumber !== undefined;

    if (hasSeasons || (hasEpisodes && !item.runtime)) {
        return "tv";
    }

    // 5. Movie structural signals (runtime exists, release_date without seasons)
    const hasRuntime = typeof item.runtime === "number" && item.runtime > 0;
    if (hasRuntime && !hasSeasons && !hasEpisodes) {
        return "movie";
    }

    // 6. Date indicators
    if (item.first_air_date || item.air_date) {
        return "tv";
    }
    if (item.release_date) {
        return "movie";
    }

    // 7. Structural naming convention (TMDB uses 'name' for TV and 'title' for Movies)
    if (item.name && !item.title) {
        return "tv";
    }

    return "movie"; // Safe canonical default
}

/**
 * Checks if the content item is a Movie.
 */
export function isMovieContent(item: any): boolean {
    const type = detectMediaType(item);
    if (type === "movie") return true;
    if (type === "anime") {
        const format = String(item.format || item.type || "").toLowerCase();
        return format === "movie" || item.totalEpisodes === 1;
    }
    return false;
}

/**
 * Checks if the content item is a Series / Episodic TV show.
 */
export function isSeriesContent(item: any): boolean {
    return !isMovieContent(item);
}

/**
 * Returns the exact canonical watch URL for any media item.
 */
export function getCanonicalWatchHref(item: any, seasonNum?: number, episodeNum?: number | string): string {
    const mediaType = detectMediaType(item);
    let finalId = String(item.id || item._id || item.showId || "");

    if (finalId.startsWith("tmdb:")) {
        const parts = finalId.split(":");
        finalId = parts[2] || parts[1];
    }

    if (mediaType === "movie") {
        return `/watch/movie/${encodeURIComponent(finalId)}`;
    }

    if (mediaType === "tv") {
        const s = seasonNum || item.season || 1;
        const e = episodeNum || item.episodeNumber || item.episodeId || 1;
        return `/watch/tv/${encodeURIComponent(finalId)}?s=${s}&e=${e}`;
    }

    // Anime
    const ep = episodeNum || item.episodeId || item.episodeNumber || 1;
    const provider = item.provider;
    return provider
        ? `/watch/anime/${encodeURIComponent(finalId)}?ep=${encodeURIComponent(String(ep))}&provider=${encodeURIComponent(provider)}`
        : `/watch/anime/${encodeURIComponent(finalId)}?ep=${encodeURIComponent(String(ep))}`;
}

/**
 * Canonical Content Normalizer
 */
export function normalizeContent(raw: any): CanonicalContent {
    const mediaType = detectMediaType(raw);
    const id = String(raw.id || raw._id || raw.showId || "");
    const title = String(raw.title || raw.name || "Untitled");
    const poster = raw.poster || raw.poster_path || raw.image || raw.thumbnail || null;
    const backdrop = raw.backdrop || raw.backdrop_path || null;
    const year = (raw.release_date || raw.first_air_date || raw.year || "").slice(0, 4) || null;
    const rating = typeof raw.vote_average === "number" ? raw.vote_average : null;
    const isMovie = isMovieContent(raw);
    const isSeries = !isMovie;
    const isAnime = mediaType === "anime";

    return {
        id,
        showId: id,
        title,
        mediaType,
        isMovie,
        isSeries,
        isAnime,
        poster,
        backdrop,
        year,
        rating,
        duration: raw.duration || raw.runtime,
        season: raw.season,
        episode: raw.episodeNumber || raw.episodeId,
        watchHref: getCanonicalWatchHref(raw, raw.season, raw.episodeNumber || raw.episodeId)
    };
}
