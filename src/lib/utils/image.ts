/**
 * Anime Image Resolver Utility
 * Implements strict fallback hierarchy for anime images to prevent broken posters/backdrops.
 */

export function resolveAnimeImage(
    anilistData?: any,
    tmdbData?: any,
    malData?: any,
    type: 'poster' | 'backdrop' = 'poster',
    fallbackUrl: string = '/placeholder.jpg'
): string {
    if (type === 'poster') {
        // Hierarchy: AniList ExtraLarge -> AniList Large -> TMDB Poster -> MAL Image -> Fallback
        if (anilistData?.coverImage?.extraLarge) return anilistData.coverImage.extraLarge;
        if (anilistData?.coverImage?.large) return anilistData.coverImage.large;
        if (tmdbData?.poster_path) return `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
        if (malData?.images?.jpg?.large_image_url) return malData.images.jpg.large_image_url;
        if (malData?.images?.jpg?.image_url) return malData.images.jpg.image_url;
        if (anilistData?.coverImage?.medium) return anilistData.coverImage.medium; // Last resort Anilist
        return fallbackUrl;
    } else {
        // Hierarchy: AniList Banner -> TMDB Backdrop -> Fallback
        if (anilistData?.bannerImage) return anilistData.bannerImage;
        if (tmdbData?.backdrop_path) return `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`;
        
        // If no backdrop exists, we try to use the poster as a blurred background, 
        // but typically a fallback landscape image is better.
        return fallbackUrl;
    }
}
