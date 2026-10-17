/**
 * Canonical Provider Registry
 * 
 * Provides a single source of truth for all playback servers, their canonical IDs,
 * consistent display labels, supported content types, and URL/source resolvers.
 */

export type ContentType = 'movie' | 'tv' | 'anime' | 'cartoon';

export interface ProviderUrlOptions {
    type: ContentType;
    id: string; // TMDB ID, AniList ID, or Cartoon Show ID
    season?: number;
    episode?: number;
    tmdbId?: string | null;
    aniListId?: string | null;
}

export interface CanonicalProvider {
    canonicalId: string;
    name: string;
    badge: string;
    qualityScore: number;
    supportedTypes: ContentType[];
    requiresScrape?: boolean;
    aliases: string[];
    resolveUrl: (options: ProviderUrlOptions) => string;
}

export interface NormalizedServer {
    id: string;
    serverId?: string;
    canonicalId: string;
    name: string;
    badge: string;
    type?: ContentType | string;
    requiresScrape?: boolean;
    qualityScore?: number;
    getUrl: (param1?: any, param2?: any, param3?: any, param4?: any) => string;
    [key: string]: any;
}

export const CANONICAL_PROVIDERS: CanonicalProvider[] = [
    // 1. Toon Player Link (VidLink) - Highest Reliability
    {
        canonicalId: 'vidlink',
        name: 'Toon Player Link',
        badge: 'VidLink',
        qualityScore: 105,
        supportedTypes: ['movie', 'tv', 'anime'],
        aliases: ['vidlink', 'vidlink_movie', 'vidlink_tv', 'toon4k_anime', 'toon4k'],
        resolveUrl: ({ type, id, season, episode, tmdbId }) => {
            if (type === 'anime') {
                return tmdbId 
                    ? `https://vidlink.pro/tv/${tmdbId}/1/${episode || 1}?primaryColor=3b82f6&title=false&autoplay=true`
                    : `https://vidlink.pro/embed/anime/${id}/${episode || 1}?primaryColor=3b82f6`;
            }
            return type === 'tv'
                ? `https://vidlink.pro/tv/${id}/${season || 1}/${episode || 1}?primaryColor=7C3AED&title=false&autoplay=true`
                : `https://vidlink.pro/movie/${id}?primaryColor=7C3AED&title=false&autoplay=true`;
        },
    },
    // 2. Toon Player Nest (VidNest) - High Reliability
    {
        canonicalId: 'vidnest',
        name: 'Toon Player Nest',
        badge: 'Ultra',
        qualityScore: 104,
        supportedTypes: ['movie', 'tv'],
        aliases: ['vidnest', 'vidnest_movie', 'vidnest_tv'],
        resolveUrl: ({ type, id, season, episode }) => {
            return type === 'tv'
                ? `https://vidnest.fun/tv/${id}/${season || 1}/${episode || 1}`
                : `https://vidnest.fun/movie/${id}`;
        },
    },
    // 3. Toon Player Core (VidCore) - Updated to vidcore.io
    {
        canonicalId: 'vidcore',
        name: 'Toon Player Core',
        badge: 'Core HD',
        qualityScore: 103,
        supportedTypes: ['movie', 'tv', 'anime'],
        aliases: ['vidcore', 'vidcore_movie', 'vidcore_tv', 'vidcore_anime'],
        resolveUrl: ({ type, id, season, episode, tmdbId }) => {
            if (type === 'anime') {
                return tmdbId 
                    ? `https://vidcore.io/tv/${tmdbId}/1/${episode || 1}`
                    : `https://vidsrc.cc/v2/embed/anime/${id}/${episode || 1}`;
            }
            return type === 'tv'
                ? `https://vidcore.io/tv/${id}/${season || 1}/${episode || 1}`
                : `https://vidcore.io/movie/${id}`;
        },
    },
    // 4. Toon Player Master (EmbedMaster)
    {
        canonicalId: 'embedmaster',
        name: 'Toon Player Master',
        badge: 'Master',
        qualityScore: 102,
        supportedTypes: ['movie', 'tv'],
        aliases: ['embedmaster', 'embedmaster_movie', 'embedmaster_tv'],
        resolveUrl: ({ type, id, season, episode }) => {
            return type === 'tv'
                ? `https://embedmaster.link/tv/${id}/${season || 1}/${episode || 1}`
                : `https://embedmaster.link/movie/${id}`;
        },
    },
    // 5. Toon Player Fast (VidFast) - Updated to vidfast.vc
    {
        canonicalId: 'vidfast',
        name: 'Toon Player Fast',
        badge: 'Auto-Next',
        qualityScore: 101,
        supportedTypes: ['movie', 'tv'],
        aliases: ['vidfast', 'vidfast_movie', 'vidfast_tv'],
        resolveUrl: ({ type, id, season, episode }) => {
            return type === 'tv'
                ? `https://vidfast.vc/tv/${id}/${season || 1}/${episode || 1}?autoPlay=true&title=true&poster=true&nextButton=true`
                : `https://vidfast.vc/movie/${id}?autoPlay=true&title=true&poster=true`;
        },
    },
    // 6. Toon Player Rock (VidRock)
    {
        canonicalId: 'vidrock',
        name: 'Toon Player Rock',
        badge: 'Stable',
        qualityScore: 99,
        supportedTypes: ['movie', 'tv'],
        aliases: ['vidrock', 'vidrock_movie', 'vidrock_tv'],
        resolveUrl: ({ type, id, season, episode }) => {
            return type === 'tv'
                ? `https://vidrock.net/tv/${id}/${season || 1}/${episode || 1}`
                : `https://vidrock.net/movie/${id}`;
        },
    },
    // 7. Toon Player King (VidKing)
    {
        canonicalId: 'vidking',
        name: 'Toon Player King',
        badge: 'Cinema',
        qualityScore: 98,
        supportedTypes: ['movie', 'tv'],
        aliases: ['vidking', 'vidking_movie', 'vidking_tv'],
        resolveUrl: ({ type, id, season, episode }) => {
            return type === 'tv'
                ? `https://www.vidking.net/embed/tv/${id}/${season || 1}/${episode || 1}`
                : `https://www.vidking.net/embed/movie/${id}`;
        },
    },
    // 8. Toon Player Vix (VixSrc)
    {
        canonicalId: 'vixsrc',
        name: 'Toon Player Vix',
        badge: 'HD',
        qualityScore: 97,
        supportedTypes: ['movie', 'tv'],
        aliases: ['vixsrc', 'vixsrc_movie', 'vixsrc_tv'],
        resolveUrl: ({ type, id, season, episode }) => {
            return type === 'tv'
                ? `https://vixsrc.to/tv/${id}/${season || 1}/${episode || 1}`
                : `https://vixsrc.to/movie/${id}`;
        },
    },
    // 9. Toon Player Smashy (SmashyStream)
    {
        canonicalId: 'smashystream',
        name: 'Toon Player Smashy',
        badge: 'Multi-Host',
        qualityScore: 95,
        supportedTypes: ['movie', 'tv'],
        aliases: ['smashystream', 'smashystream_movie', 'smashystream_tv'],
        resolveUrl: ({ type, id, season, episode }) => {
            return type === 'tv'
                ? `https://player.smashystream.com/show/${id}/${season || 1}/${episode || 1}`
                : `https://player.smashystream.com/movie/${id}`;
        },
    },
    // 10. Toon Player VidSrc (vidsrc-embed.ru)
    {
        canonicalId: 'vidsrc_embed_ru',
        name: 'Toon Player VidSrc',
        badge: 'VidSrc',
        qualityScore: 94,
        supportedTypes: ['movie', 'tv', 'anime'],
        aliases: ['vidsrc_embed_ru', 'vidsrc_embed', 'vidsrc_pro_anime'],
        resolveUrl: ({ type, id, season, episode, tmdbId }) => {
            if (type === 'anime') {
                const targetId = tmdbId || id;
                return `https://vidsrc-embed.ru/embed/tv?tmdb=${targetId}&season=1&episode=${episode || 1}&autoplay=1&ds_lang=en`;
            }
            return type === 'tv'
                ? `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${season || 1}&episode=${episode || 1}&autoplay=1&ds_lang=en`
                : `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&autoplay=1&ds_lang=en`;
        },
    },
    // 11. Toon Player VIP (Peachify - Mirror Fallback)
    {
        canonicalId: 'peachify',
        name: 'Toon Player VIP',
        badge: 'Multi-Audio',
        qualityScore: 60,
        supportedTypes: ['movie', 'tv', 'anime'],
        aliases: ['peachify', 'peachify_movie', 'peachify_tv', 'peachify_anime'],
        resolveUrl: ({ type, id, season, episode, tmdbId }) => {
            if (type === 'anime') {
                const targetId = tmdbId || id;
                return `https://peachify.top/?type=tv&id=${targetId}&s=1&e=${episode || 1}&autoplay=1`;
            }
            return type === 'tv'
                ? `https://peachify.top/?type=tv&id=${id}&s=${season || 1}&e=${episode || 1}&autoplay=1`
                : `https://peachify.top/?type=movie&id=${id}&autoplay=1`;
        },
    },
    // 12. Kartoons Direct - dedicated cartoon scraper
    {
        canonicalId: 'kartoons',
        name: 'Kartoons Direct',
        badge: 'Toon Player',
        qualityScore: 100,
        supportedTypes: ['cartoon'],
        requiresScrape: true,
        aliases: ['kartoons', 'kartoons_toon'],
        resolveUrl: ({ id, season, episode }) => {
            return `/api/scrape/kartoons?showId=${id}&s=${season || 1}&e=${episode || 1}&type=cartoon`;
        },
    },
    // 13. VidSrc TO (Anime)
    {
        canonicalId: 'vidsrc_to',
        name: 'VidSrc TO',
        badge: 'Anime',
        qualityScore: 99,
        supportedTypes: ['anime'],
        aliases: ['vidsrc_to', 'vidsrc_anime', 'emergency_vidsrc_to'],
        resolveUrl: ({ id, episode }) => {
            return `https://vidsrc.to/embed/anime/${id}/${episode || 1}`;
        },
    },
    // 14. VidSrc Me (Anime)
    {
        canonicalId: 'vidsrc_me',
        name: 'VidSrc Me',
        badge: 'Backup',
        qualityScore: 98,
        supportedTypes: ['anime'],
        aliases: ['vidsrc_me', 'vidsrc_me_anime', 'emergency_mal'],
        resolveUrl: ({ id, episode }) => {
            return `https://vidsrc.me/embed/anime?anilist=${id}&episode=${episode || 1}`;
        },
    },
    // 15. VidSrc CC (Anime)
    {
        canonicalId: 'vidsrc_cc',
        name: 'VidSrc CC',
        badge: 'Mirror',
        qualityScore: 85,
        supportedTypes: ['anime'],
        aliases: ['vidsrc_cc', 'emergency_vidsrc_cc'],
        resolveUrl: ({ id, episode }) => {
            return `https://vidsrc.cc/v2/embed/anime/${id}/${episode || 1}`;
        },
    },
    // 16. AutoEmbed (Anime)
    {
        canonicalId: 'autoembed',
        name: 'AutoEmbed Anime',
        badge: 'Auto',
        qualityScore: 80,
        supportedTypes: ['anime'],
        aliases: ['autoembed', 'emergency_autoembed'],
        resolveUrl: ({ id, episode }) => {
            return `https://player.autoembed.cc/embed/anime/${id}/${episode || 1}`;
        },
    },
    // 17-25. Native Anime Scrapers
    ...(['allanime', 'hianime', 'animepahe', 'anikai', 'aniwatch', 'aniwatchtv', 'gogoanime', 'consumet', 'cinevo'] as const).map(name => ({
        canonicalId: name,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        badge: 'Native',
        qualityScore: 90,
        supportedTypes: ['anime' as ContentType],
        requiresScrape: true,
        aliases: [name],
        resolveUrl: () => '',
    })),
];

// Quick index of aliases -> CanonicalProvider
const ALIAS_MAP = new Map<string, CanonicalProvider>();
CANONICAL_PROVIDERS.forEach(provider => {
    ALIAS_MAP.set(provider.canonicalId.toLowerCase(), provider);
    provider.aliases.forEach(alias => {
        ALIAS_MAP.set(alias.toLowerCase(), provider);
    });
});

/**
 * Retrieve canonical provider information from any legacy ID, alias, or serverId
 */
export function getCanonicalProvider(idOrAlias?: string | null): CanonicalProvider | undefined {
    if (!idOrAlias) return undefined;
    const clean = String(idOrAlias).trim().toLowerCase();
    return ALIAS_MAP.get(clean);
}

/**
 * Resolve any ID, alias, or serverId into its stable canonical provider ID
 */
export function getCanonicalProviderId(idOrAlias?: string | null): string {
    if (!idOrAlias) return '';
    const found = getCanonicalProvider(idOrAlias);
    if (found) return found.canonicalId;
    
    // Normalize string: strip _movie, _tv, _anime suffix if present
    const clean = String(idOrAlias).trim().toLowerCase();
    return clean.replace(/_(movie|tv|anime)$/, '');
}

/**
 * Check if a provider ID or alias supports a specific content type
 */
export function isProviderSupportedForType(idOrAlias: string | null | undefined, type: ContentType): boolean {
    if (!idOrAlias) return false;
    const provider = getCanonicalProvider(idOrAlias);
    if (!provider) return false;
    return provider.supportedTypes.includes(type);
}

/**
 * Get all canonical providers supporting a specific content type, sorted by qualityScore descending
 */
export function getCanonicalProvidersForType(type: ContentType): CanonicalProvider[] {
    return CANONICAL_PROVIDERS
        .filter(p => p.supportedTypes.includes(type))
        .sort((a, b) => b.qualityScore - a.qualityScore);
}

/**
 * Uniform server playback parameter parser that protects against parameter inversion
 * (e.g. Content ID passed in param 1 when caller expected (type, id, s, e) or vice-versa).
 */
export function parseServerPlaybackParams(
    arg1: any,
    arg2?: any,
    arg3?: any,
    arg4?: any,
    defaultType: ContentType = 'tv'
) {
    const isExplicitType = typeof arg1 === 'string' && (arg1 === 'movie' || arg1 === 'tv' || arg1 === 'cartoon' || arg1 === 'anime');
    
    if (isExplicitType) {
        const mediaType = arg1 as ContentType;
        const contentId = String(arg2 || '');
        const sNum = typeof arg3 === 'number' ? arg3 : (parseInt(String(arg3 || 1), 10) || 1);
        const eNum = typeof arg4 === 'number' ? arg4 : (parseInt(String(arg4 || 1), 10) || 1);
        return {
            type: mediaType,
            id: contentId,
            season: sNum,
            episode: eNum,
            tmdbId: (typeof arg4 === 'string' && arg4 && !/^\d+$/.test(arg4)) ? arg4 : null,
        };
    }

    // arg1 is NOT a media type keyword — arg1 IS the content ID (e.g. "213375", "550", "naruto")
    const contentId = String(arg1 || '');
    // arg2 is episode or season
    const epNum = typeof arg2 === 'number' ? arg2 : (parseInt(String(arg2 || 1), 10) || 1);
    let sNum = 1;
    let tmdbId: string | null = null;
    if (typeof arg3 === 'number') {
        sNum = arg3;
    } else if (typeof arg3 === 'string' && arg3 && arg3 !== 'null') {
        if (/^\d+$/.test(arg3) && arg3.length > 3) {
            tmdbId = arg3;
        } else {
            sNum = parseInt(arg3, 10) || 1;
        }
    }

    return {
        type: defaultType,
        id: contentId,
        season: sNum,
        episode: epNum,
        tmdbId,
    };
}

/**
 * Convert any server-like object or canonical provider into a NormalizedServer
 * with unified identity and polymorphically safe getUrl method.
 */
export function createNormalizedServer(
    serverOrCanonical: any,
    targetType: ContentType = 'movie',
    defaultId: string = '',
    defaultS: number = 1,
    defaultE: number = 1,
    tmdbId?: string | null
): NormalizedServer {
    const rawId = serverOrCanonical?.serverId || serverOrCanonical?.id || serverOrCanonical?.canonicalId || '';
    const canonical = getCanonicalProvider(rawId) || getCanonicalProvider(serverOrCanonical?.canonicalId);

    const canonicalId = canonical?.canonicalId || getCanonicalProviderId(rawId) || 'unknown';
    const name = canonical?.name || serverOrCanonical?.name || 'Unknown Server';
    const badge = canonical?.badge || serverOrCanonical?.badge || 'HD';
    const qualityScore = canonical?.qualityScore ?? serverOrCanonical?.qualityScore ?? 50;
    const requiresScrape = canonical?.requiresScrape ?? serverOrCanonical?.requiresScrape ?? false;

    return {
        ...serverOrCanonical,
        id: canonicalId,
        serverId: rawId || canonicalId,
        canonicalId,
        name,
        badge,
        type: targetType,
        requiresScrape,
        qualityScore,
        getUrl: (p1?: any, p2?: any, p3?: any, p4?: any) => {
            // Priority 1: Use canonical provider resolveUrl if available
            if (canonical) {
                const parsed = parseServerPlaybackParams(p1, p2, p3, p4, targetType);
                return canonical.resolveUrl({
                    type: parsed.type,
                    id: parsed.id || defaultId,
                    season: parsed.season || defaultS,
                    episode: parsed.episode || defaultE,
                    tmdbId: parsed.tmdbId || tmdbId || null,
                });
            }

            // Priority 2: Use existing getUrl on original object if present
            if (typeof serverOrCanonical?.getUrl === 'function') {
                return serverOrCanonical.getUrl(p1, p2, p3, p4);
            }

            return '';
        },
    };
}

/**
 * Deduplicate any list of servers strictly by their canonical provider ID.
 * When multiple server registrations (e.g. vidlink_movie, vidlink_tv) exist for the same
 * logical provider, exactly ONE normalized server entry is retained.
 *
 * If targetType is provided, also filters out providers that do not support targetType.
 */
export function deduplicateServersByCanonicalId<T extends { id?: string; serverId?: string; canonicalId?: string; name?: string; type?: string }>(
    servers: T[],
    targetType?: ContentType
): (T & { canonicalId: string })[] {
    if (!Array.isArray(servers)) return [];

    const seenCanonicalIds = new Set<string>();
    const result: (T & { canonicalId: string })[] = [];

    for (const server of servers) {
        if (!server) continue;
        const rawId = server.serverId || server.id || server.canonicalId || '';
        const canonicalId = getCanonicalProviderId(rawId);

        // If targetType is specified, filter out providers not supported for targetType
        if (targetType) {
            const canonical = getCanonicalProvider(canonicalId);
            if (canonical && !canonical.supportedTypes.includes(targetType)) {
                continue;
            }
            // For custom cartoon servers, only allow when type is cartoon
            if (server.type === 'cartoon' && targetType !== 'cartoon') {
                continue;
            }
        }

        if (!seenCanonicalIds.has(canonicalId)) {
            seenCanonicalIds.add(canonicalId);
            result.push({
                ...server,
                canonicalId,
            });
        }
    }

    return result;
}

/**
 * Direct URL resolver helper using the canonical registry
 */
export function buildServerUrl(canonicalIdOrAlias: string, options: ProviderUrlOptions): string {
    const provider = getCanonicalProvider(canonicalIdOrAlias);
    if (!provider) return '';
    return provider.resolveUrl(options);
}
