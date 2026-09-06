import { AnimeProvider, ProviderName, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { getProvider } from './index';

// Priority list for fallback
const FALLBACK_ORDER: ProviderName[] = [
    'hianime',
    'consumet',
    'aniwatch',
    'anikai',
    'aniwave',
    'aniwatchtv',
    'animepahe',
    'gogoanime',
    'allanime',
    'cinevo',
    'vidsrc',
    'jikan',
];

export function normalizeProvider(name?: string | null): ProviderName {
    if (!name) return 'hianime';
    const lower = name.toLowerCase().trim();
    if (lower === 'hi' || lower === 'hianime' || lower === 'hianime_fallback') return 'hianime';
    if (lower === 'aw' || lower === 'aniwatch') return 'aniwatch';
    if (lower === 'anikai') return 'anikai';
    if (lower === 'allanime') return 'allanime';
    if (lower === 'aniwave') return 'aniwave';
    if (lower === 'aniwatchtv') return 'aniwatchtv';
    if (lower === 'consumet' || lower === 'anilist') return 'consumet';
    if (lower === 'gogoanime') return 'gogoanime';
    if (lower === 'animepahe') return 'animepahe';
    if (lower === 'cinevo') return 'cinevo';
    if (lower === 'vidsrc') return 'vidsrc';
    if (lower === 'jikan') return 'jikan';
    return 'hianime';
}

export function isValidVideoSource(source: any): boolean {
    if (!source || typeof source !== 'object') return false;
    const url = source.url || source.link;
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.trim();
    if (
        cleanUrl.length === 0 ||
        cleanUrl === 'null' ||
        cleanUrl === 'undefined' ||
        cleanUrl === 'about:blank' ||
        cleanUrl.includes('undefined') ||
        cleanUrl.includes('[object')
    ) {
        return false;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/api/')) {
        return false;
    }
    return true;
}

function safeGetProvider(name: ProviderName): AnimeProvider | null {
    try {
        return getProvider(name);
    } catch {
        return null;
    }
}

export class AnimeProviderManager {
    static async search(query: string): Promise<AnimeSearchResult[]> {
        const cleanQuery = (query || '').trim();
        if (!cleanQuery) return [];

        const errors: string[] = [];
        for (const providerName of FALLBACK_ORDER) {
            try {
                const provider = safeGetProvider(providerName);
                if (!provider) continue;
                const results = await Promise.race([
                    provider.search(cleanQuery),
                    new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Timeout after 7000ms')), 7000))
                ]);
                if (results && Array.isArray(results) && results.length > 0) {
                    const validResults = results.filter(r => r && r.id && r.title);
                    if (validResults.length > 0) return validResults;
                }
            } catch (err: any) {
                errors.push(`[${providerName}] ${err.message}`);
            }
        }
        console.warn(`[AnimeProviderManager] All providers failed for search: "${cleanQuery}". Errors:`, errors);
        return [];
    }

    static async getInfo(id: string, preferredProvider?: ProviderName): Promise<AnimeDetails | null> {
        const cleanId = (id || '').trim();
        if (!cleanId) return null;

        const normalizedPref = preferredProvider ? normalizeProvider(preferredProvider) : undefined;
        const order = normalizedPref 
            ? [normalizedPref, ...FALLBACK_ORDER.filter(p => p !== normalizedPref)] 
            : FALLBACK_ORDER;
            
        const errors: string[] = [];
        for (const providerName of order) {
            try {
                const provider = safeGetProvider(providerName);
                if (!provider) continue;
                const info = await Promise.race([
                    provider.getInfo(cleanId),
                    new Promise<AnimeDetails>((_, reject) => setTimeout(() => reject(new Error('Timeout after 8000ms')), 8000))
                ]);
                if (info && info.id && Array.isArray(info.episodes)) {
                    return info;
                }
            } catch (err: any) {
                errors.push(`[${providerName}] ${err.message}`);
            }
        }
        console.warn(`[AnimeProviderManager] All providers failed for info: "${cleanId}". Errors:`, errors);
        return null;
    }

    static async getSources(
        id: string, 
        episodeId: string, 
        mode: 'sub' | 'dub' | 'raw' = 'sub', 
        preferredProvider?: ProviderName,
        serverId?: string,
        fallbackMalId?: number
    ): Promise<VideoSource[]> {
        const cleanId = (id || '').trim();
        const cleanEp = (episodeId || '').trim();
        if (!cleanId || !cleanEp) return [];

        const normalizedPref = preferredProvider ? normalizeProvider(preferredProvider) : undefined;
        const order = normalizedPref 
            ? [normalizedPref, ...FALLBACK_ORDER.filter(p => p !== normalizedPref)] 
            : FALLBACK_ORDER;

        const errors: string[] = [];
        const seenUrls = new Set<string>();
        const validSources: VideoSource[] = [];

        console.log(`[AnimeProviderManager] 🚀 Fetching sources: id=${cleanId} ep=${cleanEp} mode=${mode} pref=${normalizedPref || 'none'}`);

        for (const providerName of order) {
            const start = Date.now();
            try {
                const provider = safeGetProvider(providerName);
                if (!provider) continue;

                const sources = await Promise.race([
                    provider.getSources(cleanId, cleanEp, mode, serverId),
                    new Promise<VideoSource[]>((_, reject) => setTimeout(() => reject(new Error(`Timeout after 7000ms`)), 7000))
                ]);

                if (sources && Array.isArray(sources) && sources.length > 0) {
                    for (const s of sources) {
                        if (isValidVideoSource(s)) {
                            const url = s.url || (s as any).link;
                            if (!seenUrls.has(url)) {
                                seenUrls.add(url);
                                validSources.push({
                                    ...s,
                                    url,
                                    server: s.server || providerName,
                                    type: s.type || mode
                                });
                            }
                        }
                    }

                    if (validSources.length > 0) {
                        console.log(`[AnimeProviderManager] ⚡ ${providerName} resolved ${validSources.length} sources in ${Date.now() - start}ms`);
                        return validSources;
                    }
                }
            } catch (err: any) {
                const duration = Date.now() - start;
                errors.push(`[${providerName} (${duration}ms)] ${err.message}`);
            }
        }

        console.warn(`[AnimeProviderManager] All primary scrapers failed for ${cleanId} ep ${cleanEp}. Attempting multi-embed fallbacks. Errors:`, errors);

        // Multi-Embed Fallbacks using MAL ID
        try {
            let finalMalId = fallbackMalId;
            if (!finalMalId && /^\d+$/.test(cleanId)) {
                finalMalId = parseInt(cleanId, 10);
            }
            if (!finalMalId) {
                const info = await this.getInfo(cleanId);
                if (info?.malId) finalMalId = info.malId;
            }

            if (finalMalId) {
                // Parse episode number
                let epNum = "1";
                if (cleanEp.includes('episode-')) {
                    const match = cleanEp.match(/episode-(\d+)/);
                    if (match) epNum = match[1];
                } else if (/^\d+$/.test(cleanEp)) {
                    epNum = cleanEp;
                }

                const fallbackEmbeds: VideoSource[] = [
                    {
                        url: `https://vidsrc.me/embed/anime?mal=${finalMalId}&episode=${epNum}`,
                        quality: 'VidSrc (Multi)',
                        isM3U8: false,
                        isIframe: true,
                        server: 'vidsrc_me',
                        type: mode
                    },
                    {
                        url: `https://vidsrc.cc/v2/embed/anime/${finalMalId}/${epNum}`,
                        quality: 'VidSrc.cc',
                        isM3U8: false,
                        isIframe: true,
                        server: 'vidsrc_cc',
                        type: mode
                    },
                    {
                        url: `https://vidsrc.net/embed/anime/${finalMalId}/${epNum}`,
                        quality: 'VidSrc.net',
                        isM3U8: false,
                        isIframe: true,
                        server: 'vidsrc_net',
                        type: mode
                    },
                    {
                        url: `https://player.autoembed.cc/embed/anime/${finalMalId}/${epNum}`,
                        quality: 'AutoEmbed',
                        isM3U8: false,
                        isIframe: true,
                        server: 'autoembed',
                        type: mode
                    }
                ];

                return fallbackEmbeds;
            }
        } catch (fallbackErr: any) {
            console.error(`[AnimeProviderManager] Fallback embed resolution failed:`, fallbackErr.message);
        }

        return [];
    }
}

export default AnimeProviderManager;
