export type ProviderErrorCode =
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'HTTP_ERROR'
    | 'EMPTY_RESPONSE'
    | 'INVALID_RESPONSE'
    | 'PARSER_ERROR'
    | 'NO_SOURCE'
    | 'UNSUPPORTED'
    | 'RATE_LIMITED'
    | 'UNKNOWN_ERROR';

export interface ProviderError {
    code: ProviderErrorCode;
    message: string;
    providerId: string;
    statusCode?: number;
    details?: any;
    durationMs?: number;
}

export interface ProviderResult<T> {
    success: boolean;
    data?: T;
    error?: ProviderError;
    providerId: string;
    durationMs: number;
    retryCount?: number;
}

export interface ProviderCapabilities {
    supportsSearch: boolean;
    supportsDetails: boolean;
    supportsEpisodes: boolean;
    supportsSources: boolean;
    supportsMovies: boolean;
    supportsSeries: boolean;
    supportsSub?: boolean;
    supportsDub?: boolean;
    supportsRaw?: boolean;
}

export interface AnimeSearchResult {
    id: string;
    canonicalId?: string;
    title: string;
    image?: string;
    releaseDate?: string;
    subOrDub?: string;
    provider?: string;
    providerId?: string;
    type?: string;
    extra?: any;
}

export interface AnimeEpisode {
    id: string;
    canonicalEpisodeId?: string;
    animeId?: string;
    number: number;
    title?: string;
}

export interface RichAnimeEpisode extends AnimeEpisode {
    image?: string;
    description?: string;
    duration?: number;
    isFiller?: boolean;
    isRecap?: boolean;
    hasDub?: boolean;
    airDate?: string;
}

export interface AnimeDetails {
    id: string;
    canonicalId?: string;
    providerId?: string;
    title: string;
    otherNames?: string[];
    image?: string;
    description?: string;
    genres?: string[];
    totalEpisodes?: number;
    episodes: AnimeEpisode[];
    availableEpisodes?: {
        sub: number;
        dub: number;
        raw?: number;
    };
    availableEpisodesDetail?: {
        sub: string[];
        dub: string[];
        raw?: string[];
    };
    anilistId?: number;
    malId?: number;
    type?: string;
    status?: string;
}

export interface AnimeMeta {
    id: string;
    malId?: number;
    anilistId?: number;
    titles: {
        romaji?: string;
        english?: string;
        native?: string;
    };
    synonyms?: string[];
    description?: string;
    coverImage: {
        extraLarge?: string;
        large?: string;
        medium?: string;
        color?: string;
    };
    bannerImage?: string;
    format?: string;
    status?: string;
    episodes?: number;
    duration?: number;
    chapters?: number;
    volumes?: number;
    season?: string;
    seasonYear?: number;
    averageScore?: number;
    popularity?: number;
    source?: string;
    genres?: string[];
    studios?: string[];
    tags?: Array<{
        name: string;
        description: string;
        rank: number;
        isMediaSpoiler: boolean;
    }>;
    trailer?: {
        id: string;
        site: string;
        thumbnail: string;
    };
    nextAiringEpisode?: {
        airingAt: number;
        timeUntilAiring: number;
        episode: number;
    };
}

export interface VideoSource {
    url: string;
    isM3U8: boolean;
    quality: string;
    isIframe?: boolean;
    server?: string;
    type?: 'sub' | 'dub' | 'raw';
    headers?: Record<string, string>;
    providerId?: string;
    subtitles?: Array<{
        url: string;
        lang: string;
        label?: string;
    }>;
}

export type ProviderName =
    | 'allanime' | 'hianime' | 'anikai' | 'aniwatch'
    | 'consumet' | 'vidsrc' | 'cinevo' | 'aniwave'
    | 'aniwatchtv' | 'jikan' | 'animepahe' | 'gogoanime'
    | 'kartoons' | 'twoembed';

export interface AnimeProvider {
    name: string;
    capabilities?: ProviderCapabilities;

    /**
     * Search for anime by title
     */
    search(query: string): Promise<AnimeSearchResult[]>;

    /**
     * Get detailed info including episode list
     */
    getInfo(id: string): Promise<AnimeDetails>;

    /**
     * Get video sources for a specific episode
     * @param id - Anime ID
     * @param episodeId - Episode ID (provider-specific)
     * @param mode - 'sub' | 'dub' | 'raw'
     * @param serverId - Optional specific server ID
     */
    getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw', serverId?: string): Promise<VideoSource[]>;

    /**
     * Get popular anime (optional)
     * @param page - Page number for pagination
     */
    getPopular?(page?: number): Promise<AnimeSearchResult[]>;

    /**
     * Get trending anime (optional)
     * @param page - Page number for pagination
     */
    getTrending?(page?: number): Promise<AnimeSearchResult[]>;

    /**
     * Get recently updated anime (optional)
     * @param page - Page number for pagination
     */
    getRecent?(page?: number): Promise<AnimeSearchResult[]>;

    /**
     * Get top anime (optional)
     * @param page - Page number for pagination
     */
    getTop?(page?: number): Promise<AnimeSearchResult[]>;

    /**
     * Get A-Z list (optional)
     * @param letter - Letter to filter by (or 'all', '0-9')
     * @param page - Page number
     */
    getAZList?(letter: string, page?: number): Promise<AnimeSearchResult[]>;

    /**
     * Get anime by genre (optional)
     * @param genre - Genre ID/slug
     * @param page - Page number
     */
    getGenre?(genre: string, page?: number): Promise<AnimeSearchResult[]>;

    /**
     * Get servers for an episode (optional, if provider exposes them)
     * @param episodeId - Episode ID
     */
    getServers?(episodeId: string): Promise<any[]>;

    /**
     * Get top upcoming anime (optional)
     */
    getUpcoming?(): Promise<AnimeSearchResult[]>;

    /**
     * Get TV series list (optional)
     * @param page - Page number
     */
    getTVSeries?(page?: number): Promise<AnimeSearchResult[]>;

    /**
     * Get completed anime (optional)
     */
    getCompleted?(): Promise<AnimeSearchResult[]>;
}

export type ProviderSourceStatus =
    | 'SUCCESS'
    | 'NO_SOURCE'
    | 'TIMEOUT'
    | 'SCRAPER_ERROR'
    | 'TEMPORARY_FAILURE'
    | 'UNSUPPORTED'
    | 'UNAVAILABLE';

export interface ProviderSourceResult {
    provider: ProviderName;
    status: ProviderSourceStatus;
    sources: VideoSource[];
    error?: ProviderError;
    durationMs: number;
}

export interface SourceResolution {
    success: boolean;
    sources: VideoSource[];
    providerResults: ProviderSourceResult[];
    resolvedBy: ProviderName[];
    totalDurationMs: number;
    tier: 1 | 2 | 3 | 4;
    errorSummary?: string;
}

/**
 * 2Embed Normalized Content Contracts
 */
export interface TwoEmbedNormalizedMedia {
    id: string; // internal / canonical string
    tmdb_id?: number | null;
    imdb_id?: string | null;
    provider: 'twoembed';
    provider_id: string;
    media_type: 'movie' | 'tv';
    title: string;
    name?: string;
    overview: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    poster?: string;
    backdrop?: string;
    vote_average?: number;
    year?: number | string;
    genres?: string[];
    cast?: string[];
    crew?: string[];
    trailer?: string | null;
}

export interface TwoEmbedNormalizedMovie extends TwoEmbedNormalizedMedia {
    media_type: 'movie';
    runtime?: number;
}

export interface TwoEmbedNormalizedTv extends TwoEmbedNormalizedMedia {
    media_type: 'tv';
    last_air_date?: string;
    number_of_seasons?: number;
    number_of_episodes?: number;
    seasons?: Array<{
        season_number: number;
        episode_count: number;
        name?: string;
        poster_path?: string | null;
    }>;
}

export interface TwoEmbedNormalizedEpisode {
    id: number;
    episode_number: number;
    season_number: number;
    name: string;
    overview: string;
    air_date?: string;
    still_path?: string | null;
    still?: string | null;
}

export interface TwoEmbedNormalizedSeason {
    id: number | string;
    season_number: number;
    name: string;
    episodes: TwoEmbedNormalizedEpisode[];
}

