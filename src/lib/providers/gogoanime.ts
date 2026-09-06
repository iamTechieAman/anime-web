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
import { ParserError, safeString, safeInt, safeArray, isValidUrl, sanitizeUrl } from './parser-utils';

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
            const results = safeArray(data?.results);
            return results.map((item: any) => ({
                id: safeString(item?.id),
                title: safeString(item?.title, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
                extra: {
                    url: item?.url,
                    subOrDub: item?.subOrDub,
                },
            })).filter((item): item is AnimeSearchResult => Boolean(item.id));
        } catch (err) {
            console.error('[Gogoanime] Search failed:', err);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const data = await consumetFetch(`/anime/gogoanime/info/${id}`);
            if (!data || typeof data !== 'object') {
                throw new ParserError(this.name, 'getInfo', id, 'Invalid response shape from Gogoanime');
            }

            const rawEpisodes = safeArray(data.episodes);
            const episodes = rawEpisodes.map((ep: any) => ({
                id: safeString(ep?.id),
                number: safeInt(ep?.number, 0),
                title: safeString(ep?.title) || `Episode ${safeInt(ep?.number, 0)}`,
            })).filter(ep => Boolean(ep.id) && ep.number > 0);

            return {
                id: safeString(data.id, id),
                title: safeString(data.title, id),
                image: sanitizeUrl(data.image),
                description: safeString(data.description),
                episodes,
                totalEpisodes: safeInt(data.totalEpisodes, episodes.length),
                availableEpisodes: {
                    sub: data.subOrDub === 'sub' || data.subOrDub === 'both' ? episodes.length : 0,
                    dub: data.subOrDub === 'dub' || data.subOrDub === 'both' ? episodes.length : 0,
                },
            };
        } catch (err) {
            console.error('[Gogoanime] GetInfo failed:', err);
            throw err;
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
            return safeArray(data?.results).map((item: any) => ({
                id: safeString(item?.id),
                title: safeString(item?.title, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
                extra: { episodeId: item?.episodeId, episodeNumber: item?.episodeNumber },
            })).filter((item): item is AnimeSearchResult => Boolean(item.id));
        } catch { return []; }
    }

    async getTop(page = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await consumetFetch(`/anime/gogoanime/top-airing?page=${page}`);
            return safeArray(data?.results).map((item: any) => ({
                id: safeString(item?.id),
                title: safeString(item?.title, 'Unknown'),
                image: sanitizeUrl(item?.image),
                provider: this.name,
            })).filter((item): item is AnimeSearchResult => Boolean(item.id));
        } catch { return []; }
    }

    async getTrending(_p = 1): Promise<AnimeSearchResult[]> {
        return this.getTop(_p);
    }
}
