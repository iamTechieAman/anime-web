/**
 * Gogoanime Dedicated Provider
 * Routes through Consumet's /anime/gogoanime/ endpoints directly.
 * More reliable than the generic /meta/anilist/ path because it skips
 * the AniList ID → Gogoanime ID resolution step.
 *
 * Gogoanime is the most widely mirrored source and Consumet has native support.
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
    throw new Error(`Gogoanime (Consumet) all instances failed: ${errors.join(' | ')}`);
}

export class GogoanimeProvider implements AnimeProvider {
    name = 'gogoanime';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await consumetFetch(`/anime/gogoanime/${encodeURIComponent(query)}`);
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                provider: this.name,
                extra: {
                    url: item.url,
                    subOrDub: item.subOrDub,
                },
            }));
        } catch (err) {
            console.error('[Gogoanime] Search failed:', err);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const data = await consumetFetch(`/anime/gogoanime/info/${id}`);
            const episodes = (data?.episodes || []).map((ep: any) => ({
                id: ep.id,
                number: ep.number,
                title: `Episode ${ep.number}`,
            }));

            return {
                id: data.id,
                title: data.title,
                image: data.image,
                description: data.description,
                episodes,
                totalEpisodes: data.totalEpisodes || episodes.length,
                availableEpisodes: {
                    sub: data.subOrDub === 'sub' || data.subOrDub === 'both' ? episodes.length : 0,
                    dub: data.subOrDub === 'dub' || data.subOrDub === 'both' ? episodes.length : 0,
                },
            };
        } catch (err) {
            console.error('[Gogoanime] GetInfo failed:', err);
            throw new Error(`Gogoanime getInfo failed: ${err}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            // Resolve episode ID: Gogoanime uses slug-based episode IDs like "one-piece-episode-1"
            let episodeId = episodeString;
            if (/^\d+$/.test(episodeString)) {
                // Construct slug format: {show-id}-episode-{number}
                episodeId = `${id}-episode-${episodeString}`;
            }

            // OPTION B: Direct iframe embed via Gogoanime's native embedder (embtaku)
            // By returning the native iframe, we bypass the need to decrypt the AES-256 ajax layer
            // and skip the broken Consumet API completely.
            return [
                {
                    url: `https://embtaku.pro/streaming.php?id=${episodeId}`,
                    quality: 'Gogoanime (Native)',
                    isM3U8: false,
                    isIframe: true,
                    server: 'embtaku'
                },
                {
                    url: `https://gogoanime3.co/streaming.php?id=${episodeId}`,
                    quality: 'Gogoanime (Mirror)',
                    isM3U8: false,
                    isIframe: true,
                    server: 'gogo3'
                }
            ];
        } catch (err: any) {
            console.error('[Gogoanime] GetSources failed:', err.message);
            throw err;
        }
    }

    async getAZList(_l: string, _p = 1): Promise<AnimeSearchResult[]> { return []; }
    async getGenre(_g: string, _p = 1): Promise<AnimeSearchResult[]> { return []; }

    async getRecent(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await consumetFetch(`/anime/gogoanime/recent-episodes?page=${page}`);
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                provider: this.name,
                extra: { episodeId: item.episodeId, episodeNumber: item.episodeNumber },
            }));
        } catch { return []; }
    }

    async getTop(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await consumetFetch(`/anime/gogoanime/top-airing?page=${page}`);
            return (data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                provider: this.name,
            }));
        } catch { return []; }
    }

    async getTrending(_p = 1): Promise<AnimeSearchResult[]> {
        return this.getTop(_p);
    }
}
