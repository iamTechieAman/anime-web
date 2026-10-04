/**
 * AnimePahe Provider
 * Routes through Consumet's /anime/animepahe/ endpoints.
 * AnimePahe has high-quality 720p/1080p sources with proper sub/dub labelling.
 * Direct scraping requires session cookies + DDOS-Guard bypass → use Consumet adapter.
 */

import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { getUA } from '@/lib/user-agents';
import { ParserError, safeString, safeInt, safeArray, isValidUrl, sanitizeUrl, normalizeQuality } from './parser-utils';

const CONSUMET_INSTANCES = [
    'https://consumet-api.onrender.com',
    'https://consumet-api-clone.vercel.app',
    'https://api.consumet.org',
];

async function consumetFetch(path: string): Promise<any> {
    const errors: string[] = [];
    for (const base of CONSUMET_INSTANCES) {
        try {
            const res = await axios.get(`${base}${path}`, {
                timeout: 9000,
                headers: { 'User-Agent': getUA(), 'Accept': 'application/json' },
            });
            if (res.data) return res.data;
        } catch (e: any) {
            errors.push(`${base}: ${e.message}`);
        }
    }
    throw new Error(`AnimePahe (Consumet) all instances failed: ${errors.join(' | ')}`);
}

export class AnimePaheProvider implements AnimeProvider {
    name = 'animepahe';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await consumetFetch(`/anime/animepahe/${encodeURIComponent(query)}`);
            const results = safeArray(data?.results);
            return results.map((item: any) => ({
                id: safeString(item?.id),
                title: safeString(item?.title, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
                extra: { year: item?.year, status: item?.status },
            })).filter((item) => Boolean(item.id)) as AnimeSearchResult[];
        } catch (err) {
            console.error('[AnimePahe] Search failed:', err);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const data = await consumetFetch(`/anime/animepahe/info/${id}`);
            if (!data || typeof data !== 'object') {
                throw new ParserError(this.name, 'getInfo', id, 'Invalid response shape from AnimePahe');
            }

            const rawEpisodes = safeArray(data.episodes);
            const episodes = rawEpisodes.map((ep: any) => ({
                id: safeString(ep?.id),
                number: safeInt(ep?.number, 0),
                title: safeString(ep?.title) || `Episode ${safeInt(ep?.number, 0)}`,
                image: sanitizeUrl(ep?.image),
            })).filter(ep => Boolean(ep.id) && ep.number > 0);

            return {
                id: safeString(data.id, id),
                title: safeString(data.title, id),
                image: sanitizeUrl(data.image),
                description: safeString(data.description),
                episodes,
                totalEpisodes: safeInt(data.totalEpisodes, episodes.length),
                availableEpisodes: { sub: episodes.length, dub: 0 },
            };
        } catch (err) {
            console.error('[AnimePahe] GetInfo failed:', err);
            throw err;
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            // AnimePahe episode IDs are UUIDs, not numbers
            let episodeId = episodeString;
            if (/^\d+$/.test(episodeString)) {
                const info = await this.getInfo(id);
                const ep = info.episodes.find((e: any) => e.number === parseInt(episodeString));
                if (ep?.id) episodeId = ep.id;
            }

            const data = await consumetFetch(`/anime/animepahe/watch/${episodeId}`);
            const sourcesList = safeArray<any>(data?.sources);
            if (sourcesList.length === 0) throw new Error('No sources from AnimePahe');

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

            if (validSources.length === 0) throw new Error('All AnimePahe sources were invalid');
            return validSources;
        } catch (err: any) {
            console.error('[AnimePahe] GetSources failed:', err.message);
            throw err;
        }
    }

    async getAZList(_l: string, _p = 1): Promise<AnimeSearchResult[]> { return []; }
    async getGenre(_g: string, _p = 1): Promise<AnimeSearchResult[]> { return []; }
    async getRecent(_p = 1): Promise<AnimeSearchResult[]> { return []; }
    async getTop(_p = 1): Promise<AnimeSearchResult[]> { return []; }
    async getTrending(_p = 1): Promise<AnimeSearchResult[]> { return []; }
}
