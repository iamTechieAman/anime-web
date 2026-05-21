/**
 * AnimePahe Provider
 * Routes through Consumet's /anime/animepahe/ endpoints.
 * AnimePahe has high-quality 720p/1080p sources with proper sub/dub labelling.
 * Direct scraping requires session cookies + DDOS-Guard bypass → use Consumet adapter.
 */

import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { getUA } from '@/lib/user-agents';

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
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                provider: this.name,
                extra: { year: item.year, status: item.status },
            }));
        } catch (err) {
            console.error('[AnimePahe] Search failed:', err);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const data = await consumetFetch(`/anime/animepahe/info/${id}`);
            const episodes = (data?.episodes || []).map((ep: any) => ({
                id: ep.id,
                number: ep.number,
                title: ep.title || `Episode ${ep.number}`,
                image: ep.image,
            }));
            return {
                id: data.id,
                title: data.title,
                image: data.image,
                description: data.description,
                episodes,
                totalEpisodes: data.totalEpisodes || episodes.length,
                availableEpisodes: { sub: episodes.length, dub: 0 },
            };
        } catch (err) {
            console.error('[AnimePahe] GetInfo failed:', err);
            throw new Error(`AnimePahe getInfo failed: ${err}`);
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
            if (!data?.sources?.length) throw new Error('No sources from AnimePahe');

            return data.sources.map((src: any) => ({
                url: src.url,
                quality: src.quality,
                isM3U8: src.isM3U8 || src.url?.includes('.m3u8'),
            }));
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
