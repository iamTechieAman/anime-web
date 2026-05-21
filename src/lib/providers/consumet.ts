import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';

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

export class ConsumetProvider implements AnimeProvider {
    name = 'consumet';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/${encodeURIComponent(query)}`);
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title?.english || item.title?.romaji || item.title?.native,
                image: item.image,
                provider: this.name,
            }));
        } catch (error) {
            console.error('[Consumet] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/info/${id}`);
            const episodes = (data.episodes || []).map((ep: any) => ({
                id: ep.id,
                number: ep.number,
                title: ep.title || `Episode ${ep.number}`,
            }));
            return {
                id: data.id,
                title: data.title?.english || data.title?.romaji || data.title?.native,
                image: data.image,
                description: data.description,
                episodes,
                totalEpisodes: data.totalEpisodes || episodes.length,
            };
        } catch (error) {
            console.error('[Consumet] GetInfo failed:', error);
            throw new Error(`Consumet getInfo failed: ${error}`);
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
            if (data?.sources?.length) {
                return data.sources.map((src: any) => ({
                    url: src.url,
                    quality: src.quality,
                    isM3U8: src.isM3U8 || src.url?.includes('.m3u8'),
                }));
            }
            throw new Error('No sources in Consumet response');

        } catch (error: any) {
            console.error('[Consumet] GetSources failed:', error.message);

            // Consumet fallback: try Gogoanime endpoint directly
            try {
                const info = await this.getInfo(id);
                const title = info.title;
                const gogoData = await fetchFromInstances(`/anime/gogoanime/${encodeURIComponent(title)}`);
                if (gogoData?.results?.length) {
                    const gogoId = mode === 'dub'
                        ? (gogoData.results.find((r: any) => r.id?.includes('-dub'))?.id || gogoData.results[0].id)
                        : gogoData.results[0].id;

                    const gogoInfo = await fetchFromInstances(`/anime/gogoanime/info/${gogoId}`);
                    const targetEp = (gogoInfo?.episodes || []).find((ep: any) => ep.number === parseInt(episodeString));
                    if (targetEp?.id) {
                        const gogoWatch = await fetchFromInstances(`/anime/gogoanime/watch/${targetEp.id}`);
                        if (gogoWatch?.sources?.length) {
                            return gogoWatch.sources.map((src: any) => ({
                                url: src.url,
                                quality: src.quality,
                                isM3U8: src.isM3U8 || src.url?.includes('.m3u8'),
                            }));
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
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title?.english || item.title?.romaji || item.title?.native,
                image: item.image,
                provider: this.name,
            }));
        } catch { return []; }
    }

    async getTop(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/popular?page=${page}`);
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title?.english || item.title?.romaji || item.title?.native,
                image: item.image,
                provider: this.name,
            }));
        } catch { return []; }
    }

    async getTrending(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromInstances(`/meta/anilist/trending?page=${page}`);
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title?.english || item.title?.romaji || item.title?.native,
                image: item.image,
                provider: this.name,
            }));
        } catch { return []; }
    }
}
