import { AnimeProvider, ProviderName, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { getProvider } from './index';

// Priority list for fallback
const FALLBACK_ORDER: ProviderName[] = [
    'hianime',
    'consumet',
    'aniwatch',
    'animepahe',
    'gogoanime',
    'allanime',
];

export class AnimeProviderManager {
    static async search(query: string): Promise<AnimeSearchResult[]> {
        let errors = [];
        for (const providerName of FALLBACK_ORDER) {
            try {
                const provider = getProvider(providerName);
                if (!provider) continue;
                // Add an abort controller for timeout
                const results = await Promise.race([
                    provider.search(query),
                    new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);
                if (results && results.length > 0) return results;
            } catch (err: any) {
                errors.push(`[${providerName}] ${err.message}`);
                console.warn(`[AnimeProviderManager] ${providerName} search failed, falling back...`);
            }
        }
        console.error(`[AnimeProviderManager] All providers failed for search: ${query}`, errors);
        return [];
    }

    static async getInfo(id: string, preferredProvider?: ProviderName): Promise<AnimeDetails | null> {
        const order = preferredProvider 
            ? [preferredProvider, ...FALLBACK_ORDER.filter(p => p !== preferredProvider)] 
            : FALLBACK_ORDER;
            
        let errors = [];
        for (const providerName of order) {
            try {
                const provider = getProvider(providerName);
                if (!provider) continue;
                const info = await Promise.race([
                    provider.getInfo(id),
                    new Promise<AnimeDetails>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);
                if (info) return info;
            } catch (err: any) {
                errors.push(`[${providerName}] ${err.message}`);
            }
        }
        console.error(`[AnimeProviderManager] All providers failed for info: ${id}`, errors);
        return null;
    }

    static async getSources(
        id: string, 
        episodeId: string, 
        mode: 'sub' | 'dub' | 'raw', 
        preferredProvider?: ProviderName,
        serverId?: string,
        fallbackMalId?: number // Support passing malId directly if caller has it
    ): Promise<VideoSource[]> {
        const order = preferredProvider 
            ? [preferredProvider, ...FALLBACK_ORDER.filter(p => p !== preferredProvider)] 
            : FALLBACK_ORDER;

        let errors = [];
        for (const providerName of order) {
            try {
                const provider = getProvider(providerName);
                if (!provider) continue;
                const sources = await Promise.race([
                    provider.getSources(id, episodeId, mode, serverId),
                    new Promise<VideoSource[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
                ]);
                if (sources && sources.length > 0) return sources;
            } catch (err: any) {
                errors.push(`[${providerName}] ${err.message}`);
            }
        }
        console.error(`[AnimeProviderManager] All scraping providers failed for sources: ${id} ep ${episodeId}`, errors);

        // OPTION A: Instant Fallback to Generic Iframe Embeds
        // If all scrapers fail (or are blocked by Cloudflare), try to return generic multi-embeds 
        // to restore streaming immediately.
        try {
            console.log(`[AnimeProviderManager] Attempting Option A (Generic Embeds) for ${id}`);
            // Get info to find malId
            const info = await this.getInfo(id);
            if (info?.malId || fallbackMalId) {
                const finalMalId = info?.malId || fallbackMalId;
                
                // Parse episode number
                let epNum = "1";
                if (typeof episodeId === 'string' && episodeId.includes('episode-')) {
                    const match = episodeId.match(/episode-(\d+)/);
                    if (match) epNum = match[1];
                } else if (/^\d+$/.test(episodeId)) {
                    epNum = episodeId;
                } else if (info) {
                    const epObj = info.episodes.find(e => e.id === episodeId);
                    if (epObj) epNum = epObj.number.toString();
                }

                return [
                    {
                        url: `https://vidsrc.me/embed/anime?mal=${finalMalId}&episode=${epNum}`,
                        quality: 'VidSrc (Multi)',
                        isM3U8: false,
                        isIframe: true,
                        server: 'vidsrc_me'
                    },
                    {
                        url: `https://vidsrc.cc/v2/embed/anime/${finalMalId}/${epNum}`,
                        quality: 'VidSrc.cc',
                        isM3U8: false,
                        isIframe: true,
                        server: 'vidsrc_cc'
                    },
                    {
                        url: `https://vidsrc.net/embed/anime/${finalMalId}/${epNum}`,
                        quality: 'VidSrc.net',
                        isM3U8: false,
                        isIframe: true,
                        server: 'vidsrc_net'
                    },
                    {
                        url: `https://player.autoembed.cc/embed/anime/${finalMalId}/${epNum}`,
                        quality: 'AutoEmbed',
                        isM3U8: false,
                        isIframe: true,
                        server: 'autoembed'
                    }
                ];
            }
        } catch (fallbackErr) {
            console.error(`[AnimeProviderManager] Option A fallback failed:`, fallbackErr);
        }

        return [];
    }
}

export default AnimeProviderManager;
