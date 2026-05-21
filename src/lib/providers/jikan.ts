/**
 * Jikan Provider — MyAnimeList (MAL) API wrapper
 * jikan.moe is a free, stable, public MAL REST API.
 * Used as a fallback for episode counts and metadata when AniList is rate-limited.
 * Jikan does NOT provide stream sources — metadata only.
 */

import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { animeCache, TTL, cacheKey } from '@/lib/anime-cache';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const REQUEST_TIMEOUT = 8000;

export class JikanProvider implements AnimeProvider {
    name = 'jikan';

    async search(query: string): Promise<AnimeSearchResult[]> {
        const cached = animeCache.get<AnimeSearchResult[]>(cacheKey.search(query, 'jikan'));
        if (cached) return cached;

        try {
            const res = await axios.get(`${JIKAN_BASE}/anime`, {
                params: { q: query, limit: 10, sfw: false },
                timeout: REQUEST_TIMEOUT,
            });

            const results: AnimeSearchResult[] = (res.data?.data || []).map((item: any) => ({
                id: String(item.mal_id),
                title: item.title_english || item.title,
                image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
                provider: this.name,
                extra: {
                    malId: item.mal_id,
                    episodes: item.episodes,
                    status: item.status,
                    score: item.score,
                    airing: item.airing,
                },
            }));

            animeCache.set(cacheKey.search(query, 'jikan'), results, TTL.JIKAN_META);
            return results;
        } catch (err) {
            console.error('[Jikan] search failed:', err);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        const cached = animeCache.get<AnimeDetails>(cacheKey.jikan(id));
        if (cached) return cached;

        try {
            const [animeRes, episodesRes] = await Promise.allSettled([
                axios.get(`${JIKAN_BASE}/anime/${id}`, { timeout: REQUEST_TIMEOUT }),
                axios.get(`${JIKAN_BASE}/anime/${id}/episodes`, { timeout: REQUEST_TIMEOUT }),
            ]);

            const anime = animeRes.status === 'fulfilled' ? animeRes.value.data?.data : null;
            const episodesData = episodesRes.status === 'fulfilled' ? episodesRes.value.data?.data || [] : [];

            if (!anime) throw new Error(`Jikan: anime ${id} not found`);

            const episodes = episodesData.map((ep: any) => ({
                id: String(ep.mal_id),
                number: ep.mal_id,
                title: ep.title || ep.title_romanji || `Episode ${ep.mal_id}`,
            }));

            const totalEps = anime.episodes || episodes.length;

            // Build synthetic episode list if API didn't return episodes
            const finalEpisodes = episodes.length > 0
                ? episodes
                : Array.from({ length: totalEps }, (_, i) => ({
                    id: String(i + 1),
                    number: i + 1,
                    title: `Episode ${i + 1}`,
                }));

            const result: AnimeDetails = {
                id,
                title: anime.title_english || anime.title,
                image: anime.images?.jpg?.large_image_url,
                description: anime.synopsis,
                episodes: finalEpisodes,
                totalEpisodes: totalEps,
                availableEpisodes: { sub: totalEps, dub: 0 },
                availableEpisodesDetail: {
                    sub: finalEpisodes.map((e: any) => String(e.number)),
                    dub: [],
                },
                type: anime.type,
                status: anime.status,
            };

            animeCache.set(cacheKey.jikan(id), result, TTL.JIKAN_META);
            return result;
        } catch (err) {
            console.error('[Jikan] getInfo failed:', err);
            throw new Error(`Jikan getInfo failed: ${err}`);
        }
    }

    // Jikan does not serve streams — always throws
    async getSources(_id: string, _ep: string): Promise<VideoSource[]> {
        throw new Error('Jikan does not provide stream sources');
    }

    async getAZList(_letter: string, _page = 1): Promise<AnimeSearchResult[]> { return []; }
    async getGenre(_genre: string, _page = 1): Promise<AnimeSearchResult[]> { return []; }
    async getRecent(_page = 1): Promise<AnimeSearchResult[]> { return []; }
    async getTop(_page = 1): Promise<AnimeSearchResult[]> { return []; }
    async getTrending(_page = 1): Promise<AnimeSearchResult[]> { return []; }
}
