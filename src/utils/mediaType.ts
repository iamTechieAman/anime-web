export function detectMediaType(item: any): "movie" | "tv" | "anime" {
    if (!item) return "movie";

    // 1. Anime Detection: check if anime metadata exists
    // Fallback hierarchy: TMDB -> AniList -> MAL -> Local metadata
    const originalLanguage = item.original_language || item.originalLanguage;
    const originCountry = item.origin_country || item.originCountry;
    
    // Check JP origin / original language Japanese on TMDB
    const isJp = originalLanguage === "ja" || 
                 (Array.isArray(originCountry) && originCountry.includes("JP")) ||
                 originCountry === "JP" ||
                 originCountry === "ja";
                 
    const genres = item.genres || item.genre_ids || item.genreIds || [];
    const isAnimation = Array.isArray(genres) && genres.some((g: any) => {
        if (typeof g === "object" && g !== null) {
            return g.id === 16 || (g.name && String(g.name).toLowerCase() === "animation");
        }
        return g === 16 || String(g).toLowerCase() === "animation";
    });

    if (isJp && isAnimation) {
        return "anime";
    }

    // Check if AniList metadata exists
    if (item.anilistId || item.anilist_id || item.aniListId) {
        return "anime";
    }

    // Check if MAL metadata exists
    if (item.malId || item.mal_id) {
        return "anime";
    }

    // Check local metadata / explicit type / provider
    if (item.type === "anime" || item.media_type === "anime") {
        return "anime";
    }
    const provider = item.provider || item.showId?.split(":")?.[0];
    if (provider && ["hianime", "aniwatch", "allanime", "hianime_fallback"].includes(provider)) {
        return "anime";
    }

    // 2. TV Series Detection: seasons present, episodes present
    const hasSeasons = (item.number_of_seasons && item.number_of_seasons > 0) || 
                       (Array.isArray(item.seasons) && item.seasons.length > 0) ||
                       item.season !== undefined ||
                       (item.availableEpisodes && typeof item.availableEpisodes === "object");
                       
    const hasEpisodes = (item.number_of_episodes && item.number_of_episodes > 0) || 
                        (Array.isArray(item.episodes) && item.episodes.length > 0) ||
                        item.episodeId !== undefined ||
                        item.episodeNumber !== undefined;

    if (hasSeasons && hasEpisodes) {
        return "tv";
    }

    // 3. Movie Detection: runtime exists, episodes absent, seasons absent
    const hasRuntime = (item.runtime !== undefined && item.runtime !== null && item.runtime > 0) || 
                       (item.episode_run_time && Array.isArray(item.episode_run_time) && item.episode_run_time.length > 0);
    const episodesAbsent = !hasEpisodes;
    const seasonsAbsent = !hasSeasons;

    if (hasRuntime && episodesAbsent && seasonsAbsent) {
        return "movie";
    }

    // Fallbacks based on explicit media_type or type
    const explicitType = item.media_type || item.type;
    if (explicitType === "movie") return "movie";
    if (explicitType === "tv" || explicitType === "series" || explicitType === "show") return "tv";

    // If still ambiguous, look for date indicators
    if (item.first_air_date || item.air_date) {
        return "tv";
    }
    if (item.release_date) {
        return "movie";
    }

    // Structural properties
    if (item.name && !item.title) {
        return "tv";
    }

    return "movie"; // Default fallback
}
