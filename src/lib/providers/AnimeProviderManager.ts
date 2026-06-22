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
        serverId?: string
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
        console.error(`[AnimeProviderManager] All providers failed for sources: ${id} ep ${episodeId}`, errors);
        return [];
    }
}

export default AnimeProviderManager;
