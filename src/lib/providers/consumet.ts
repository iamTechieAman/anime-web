import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';

// Built-in Consumet API endpoint (public instance)
// Users can self-host this or we can use another public instance if this goes down
const BASE_URL = 'https://consumet-api-clone.vercel.app/meta/anilist';

export class ConsumetProvider implements AnimeProvider {
    name = 'consumet';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/${encodeURIComponent(query)}`);
            const results: AnimeSearchResult[] = [];

            if (response.data.results) {
                response.data.results.forEach((item: any) => {
                    results.push({
                        id: item.id,
                        title: item.title.english || item.title.romaji || item.title.native,
                        image: item.image,
                        provider: this.name
                    });
                });
            }

            return results;
        } catch (error) {
            console.error('[Consumet] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const response = await axios.get(`${BASE_URL}/info/${id}`);
            const data = response.data;

            const episodes = (data.episodes || []).map((ep: any) => ({
                id: ep.id,
                number: ep.number,
                title: ep.title || `Episode ${ep.number}`
            }));

            return {
                id: data.id,
                title: data.title.english || data.title.romaji || data.title.native,
                image: data.image,
                description: data.description,
                episodes,
                totalEpisodes: data.totalEpisodes || episodes.length
            };
        } catch (error) {
            console.error('[Consumet] GetInfo failed:', error);
            throw new Error(`Failed to fetch anime info: ${error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[Consumet] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}`);

            // If we only have a numeric episode string instead of the long episode ID,
            // we first need to fetch the anime info to map the episode number to its specific ID sequence.
            let watchId = episodeString;

            if (/^\d+$/.test(episodeString)) {
                console.log(`[Consumet] Resolving episode number ${episodeString} to specific watch ID...`);
                try {
                    const info = await this.getInfo(id);
                    const targetEp = info.episodes.find((ep: any) => ep.number === parseInt(episodeString));
                    if (targetEp && targetEp.id) {
                        watchId = targetEp.id;
                    } else {
                        throw new Error(`Episode ${episodeString} not found in episode list`);
                    }
                } catch (e) {
                    console.log(`[Consumet] Could not resolve episode number via AniList info, trying fallback search...`);
                    // If AniList ID info fails, we might be dealing with a raw title vs ID
                    const searchRes = await this.search(id);
                    if (searchRes.length > 0) {
                        const info = await this.getInfo(searchRes[0].id);
                        const targetEp = info.episodes.find((ep: any) => ep.number === parseInt(episodeString));
                        if (targetEp && targetEp.id) {
                            watchId = targetEp.id;
                        }
                    }
                }
            }

            console.log(`[Consumet] Executing watch request using Watch ID: ${watchId}`);

            try {
                // Try the primary anilist meta endpoint
                const response = await axios.get(`${BASE_URL}/watch/${watchId}`);
                if (response.data && response.data.sources) {
                    return response.data.sources.map((src: any) => ({
                        url: src.url,
                        quality: src.quality,
                        isM3U8: src.isM3U8 || src.url.includes('.m3u8'),
                    }));
                }
            } catch (aniErr) {
                console.log(`[Consumet] Anilist watch resolution failed for ${watchId}, falling back to direct Gogoanime search...`);
                // Fallback to searching the raw Gogoanime endpoint directly using the title
                try {
                    const info = await this.getInfo(id);
                    const title = info.title;
                    const gogoSearch = await axios.get(`https://consumet-api-clone.vercel.app/anime/gogoanime/${encodeURIComponent(title)}`);
                    if (gogoSearch.data.results && gogoSearch.data.results.length > 0) {
                        const gogoId = mode === 'dub' && gogoSearch.data.results.find((r: any) => r.id.includes('-dub'))
                            ? gogoSearch.data.results.find((r: any) => r.id.includes('-dub')).id
                            : gogoSearch.data.results[0].id;

                        const gogoInfo = await axios.get(`https://consumet-api-clone.vercel.app/anime/gogoanime/info/${gogoId}`);
                        const targetEp = gogoInfo.data.episodes.find((ep: any) => ep.number === parseInt(episodeString));

                        if (targetEp && targetEp.id) {
                            const gogoWatch = await axios.get(`https://consumet-api-clone.vercel.app/anime/gogoanime/watch/${targetEp.id}`);
                            if (gogoWatch.data && gogoWatch.data.sources) {
                                return gogoWatch.data.sources.map((src: any) => ({
                                    url: src.url,
                                    quality: src.quality,
                                    isM3U8: src.isM3U8 || src.url.includes('.m3u8'),
                                }));
                            }
                        }
                    }
                } catch (gogoErr) {
                    console.error('[Consumet] Gogoanime fallback also failed:', gogoErr);
                }
            }

            throw new Error("No sources found from Consumet services");

        } catch (error: any) {
            console.error('[Consumet] GetSources failed:', error.message);

            // Consumet can be brittle if the public instance rotates. Fallback to AllAnime.
            try {
                const allAnime = new AllAnimeProvider();
                console.log(`[Consumet-Fallback] Attempting to fallback to AllAnime...`);
                return await allAnime.getSources(id, episodeString, mode);
            } catch (fallbackError: any) {
                console.error('[Consumet-Fallback] AllAnime fallback failed:', fallbackError.message);
            }

            throw new Error(`Failed to fetch sources: ${error.message || error}`);
        }
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        return [];
    }

    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
        return [];
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/recent-episodes?page=${page}`);
            const results: AnimeSearchResult[] = [];

            if (response.data.results) {
                response.data.results.forEach((item: any) => {
                    results.push({
                        id: item.id,
                        title: item.title.english || item.title.romaji || item.title.native,
                        image: item.image,
                        provider: this.name,
                        extra: {
                            latestEpisode: item.episodeNumber
                        }
                    } as any);
                });
            }

            return results;
        } catch (error) {
            console.error('[Consumet] getRecent failed:', error);
            return [];
        }
    }

    async getTop(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/popular?page=${page}`);
            const results: AnimeSearchResult[] = [];

            if (response.data.results) {
                response.data.results.forEach((item: any) => {
                    results.push({
                        id: item.id,
                        title: item.title.english || item.title.romaji || item.title.native,
                        image: item.image,
                        provider: this.name
                    });
                });
            }

            return results;
        } catch (error) {
            console.error('[Consumet] getTop failed:', error);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/trending?page=${page}`);
            const results: AnimeSearchResult[] = [];

            if (response.data.results) {
                response.data.results.forEach((item: any) => {
                    results.push({
                        id: item.id,
                        title: item.title.english || item.title.romaji || item.title.native,
                        image: item.image,
                        provider: this.name
                    });
                });
            }

            return results;
        } catch (error) {
            console.error('[Consumet] getTrending failed:', error);
            return [];
        }
    }
}
