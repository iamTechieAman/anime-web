import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';
import { ParserError, safeString, safeInt, safeArray, isValidUrl, sanitizeUrl, normalizeQuality } from './parser-utils';

/**
 * Consumet Provider
 * Tries multiple public Consumet API instances for resilience.
 * consumet-api.com is the official instance. Falls back to clones.
 */

// Ordered list of Consumet instances — first available wins
const CONSUMET_INSTANCES = [
    'https://consumet-api-clone.vercel.app',
    'https://consumet.anime-jojo.repl.co',
    'https://consumet-api.onrender.com',
    'https://api.consumet.org',
];

const REQUEST_TIMEOUT = 8000;

async function fetchFromInstances(path: string): Promise<any> {
    const errors: string[] = [];
    for (const base of CONSUMET_INSTANCES) {
        try {
            const res = await axios.get(`${base}${path}`, { timeout: REQUEST_TIMEOUT });
            if (res.data) return res.data;
        } catch (err: any) {
            errors.push(`${base}: ${err.message}`);
        }
    }
    throw new Error(`All Consumet instances failed: ${errors.join(' | ')}`);
}

function extractTitle(titleObj: any): string {
    if (!titleObj) return '';
    if (typeof titleObj === 'string') return titleObj;
    return (
        titleObj.english ||
        titleObj.romaji ||
        titleObj.userPreferred ||
        titleObj.native ||
        ''
    );
}

export class ConsumetProvider implements AnimeProvider {
    name = 'consumet';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/${encodeURIComponent(query)}`);
            const results = safeArray(data?.results);
            return results.map((item: any) => ({
                id: safeString(item?.id),
                title: extractTitle(item?.title) || safeString(item?.id, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
            })).filter((item): item is AnimeSearchResult => Boolean(item.id));
        } catch (error) {
            console.error('[Consumet] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/info/${id}?provider=gogoanime`);
            if (!data || typeof data !== 'object') {
                throw new ParserError(this.name, 'getInfo', id, 'Invalid or empty show data returned');
            }

            const rawEpisodes = safeArray(data.episodes);
            const episodes = rawEpisodes.map((ep: any) => ({
                id: safeString(ep?.id),
                number: safeInt(ep?.number, 0),
                title: safeString(ep?.title) || `Episode ${safeInt(ep?.number, 0)}`,
                image: sanitizeUrl(ep?.image),
                description: safeString(ep?.description),
                isFiller: ep?.isFiller === true,
                hasDub: ep?.hasDub === true,
            })).filter(ep => Boolean(ep.id) && ep.number > 0);

            return {
                id: safeString(data.id, id),
                title: extractTitle(data.title) || safeString(data.id, id),
                image: sanitizeUrl(data.image),
                description: safeString(data.description),
                episodes,
                totalEpisodes: safeInt(data.totalEpisodes, episodes.length),
            };
        } catch (error) {
            console.error('[Consumet] GetInfo failed:', error);
            throw error;
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            console.log(`[Consumet] Fetching sources: ID=${id}, Ep=${episodeString}, Mode=${mode}`);

            let watchId = episodeString;

            // If given a raw episode number, resolve to Consumet episode ID
            if (/^\d+$/.test(episodeString)) {
                const info = await this.getInfo(id);
                const targetEp = info.episodes.find((ep: any) => ep.number === parseInt(episodeString));
                if (targetEp?.id) {
                    watchId = targetEp.id;
                } else {
                    throw new Error(`Episode ${episodeString} not found`);
                }
            }

            const data = await fetchFromInstances(`/meta/anilist/watch/${watchId}`);
            const sourcesList = safeArray(data?.sources);
            if (sourcesList.length > 0) {
                const validSources: VideoSource[] = [];
                for (const src of sourcesList) {
                    if (isValidUrl(src?.url)) {
                        validSources.push({
                            url: sanitizeUrl(src.url),
                            quality: normalizeQuality(src.quality),
                            isM3U8: src.isM3U8 === true || String(src.url).includes('.m3u8'),
                        });
                    }
                }
                if (validSources.length > 0) return validSources;
            }
            throw new Error('No sources in Consumet response');

        } catch (error: any) {
            console.error('[Consumet] GetSources failed:', error.message);

            // Consumet fallback: try Gogoanime endpoint directly
            try {
                const info = await this.getInfo(id);
                const title = info.title;
                const gogoData = await fetchFromInstances(`/anime/gogoanime/${encodeURIComponent(title)}`);
                const gogoResults = safeArray(gogoData?.results);
                if (gogoResults.length > 0) {
                    const gogoId = mode === 'dub'
                        ? (gogoResults.find((r: any) => r.id?.includes('-dub'))?.id || gogoResults[0].id)
                        : gogoResults[0].id;

                    const gogoInfo = await fetchFromInstances(`/anime/gogoanime/info/${gogoId}`);
                    const targetEp = safeArray(gogoInfo?.episodes).find((ep: any) => ep.number === parseInt(episodeString));
                    if (targetEp?.id) {
                        const gogoWatch = await fetchFromInstances(`/anime/gogoanime/watch/${targetEp.id}`);
                        const gogoSources = safeArray(gogoWatch?.sources);
                        if (gogoSources.length > 0) {
                            const validSources: VideoSource[] = [];
                            for (const src of gogoSources) {
                                if (isValidUrl(src?.url)) {
                                    validSources.push({
                                        url: sanitizeUrl(src.url),
                                        quality: normalizeQuality(src.quality),
                                        isM3U8: src.isM3U8 === true || String(src.url).includes('.m3u8'),
                                    });
                                }
                            }
                            if (validSources.length > 0) return validSources;
                        }
                    }
                }
            } catch (gogoErr: any) {
                console.error('[Consumet] Gogoanime fallback also failed:', gogoErr.message);
            }

            // Last resort: AllAnime
            try {
                const allAnime = new AllAnimeProvider();
                return await allAnime.getSources(id, episodeString, mode);
            } catch (fallbackError: any) {
                console.error('[Consumet] AllAnime fallback failed:', fallbackError.message);
            }

            throw new Error(`Consumet: all sources exhausted — ${error.message}`);
        }
    }

    async getAZList(_letter: string, _page = 1): Promise<AnimeSearchResult[]> { return []; }
    async getGenre(_genre: string, _page = 1): Promise<AnimeSearchResult[]> { return []; }

    async getRecent(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/recent-episodes?page=${page}`);
            return safeArray(data?.results).map((item: any) => ({
                id: safeString(item?.id),
                title: extractTitle(item?.title) || safeString(item?.id, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
            })).filter((item): item is AnimeSearchResult => Boolean(item.id));
        } catch { return []; }
    }

    async getTop(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/popular?page=${page}`);
            return safeArray(data?.results).map((item: any) => ({
                id: safeString(item?.id),
                title: extractTitle(item?.title) || safeString(item?.id, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
            })).filter((item): item is AnimeSearchResult => Boolean(item.id));
        } catch { return []; }
    }

    async getTrending(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/trending?page=${page}`);
            return safeArray(data?.results).map((item: any) => ({
                id: safeString(item?.id),
                title: extractTitle(item?.title) || safeString(item?.id, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
            })).filter((item): item is AnimeSearchResult => Boolean(item.id));
        } catch { return []; }
    }
}
