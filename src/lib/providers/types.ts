export interface AnimeSearchResult {
    id: string;
    title: string;
    image?: string;
    releaseDate?: string;
    subOrDub?: string;
    provider?: string;
}

export interface AnimeEpisode {
    id: string;
    number: number;
    title?: string;
}

export interface AnimeDetails {
    id: string;
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
    malId?: number;
    anilistId?: number;
}

export interface VideoSource {
    url: string;
    isM3U8: boolean;
    quality?: string;
}

export interface AnimeProvider {
    name: string;

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
}
