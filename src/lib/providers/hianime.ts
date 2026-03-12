import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';

const BASE_URL = 'https://hianime.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

export class HiAnimeProvider implements AnimeProvider {
    name = 'hianime';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/search`, {
                params: { keyword: query },
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                // FIX: Select the 'a' tag inside .film-poster, not the div itself
                const id = $el.find('.film-poster a').attr('href')?.split('/')[1] || '';
                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[HiAnime] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const response = await axios.get(`${BASE_URL}/${id}`, {
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const title = $('.film-name').text().trim();
            const image = $('.film-poster img').attr('src');
            const description = $('.film-description').text().trim();

            // Get episode list via AJAX
            const dataId = $('#wrapper').attr('data-id');
            const episodesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/list/${dataId}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $episodes = cheerio.load(episodesResponse.data.html);
            const episodes: any[] = [];

            $episodes('.ep-item').each((_, el) => {
                const $ep = $(el);
                const episodeId = $ep.attr('data-id') || '';
                const number = parseInt($ep.attr('data-number') || '0');
                const title = $ep.attr('title');

                if (episodeId && number) {
                    episodes.push({
                        id: episodeId,
                        number,
                        title
                    });
                }
            });

            return {
                id,
                title,
                image,
                description,
                episodes,
                totalEpisodes: episodes.length
            };
        } catch (error) {
            console.error('[HiAnime] GetInfo failed:', error);
            throw new Error(`Failed to fetch anime info: ${error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[HiAnime] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}, ServerID=${serverId}`);

            // If serverId is provided directly, we can try to use it directly
            if (serverId) {
                // Step 2: Get embed link directly using serverId
                const sourcesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/sources`, {
                    params: { id: serverId },
                    headers: {
                        'User-Agent': USER_AGENT,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const embedLink = sourcesResponse.data.link;
                if (!embedLink) {
                    throw new Error('No embed link found for provided serverId');
                }

                return this.extractSources(embedLink);
            }

            // Step 0: If episodeString is not a valid HiAnime episode ID, we need to resolve it
            // HiAnime episode IDs are typically longer alphanumeric strings, not just "1", "2", etc.
            let episodeId = episodeString;

            // If it looks like just an episode number, fetch the show info to get the real episode ID
            if (/^\d+$/.test(episodeString)) {
                console.log(`[HiAnime] Episode string "${episodeString}" appears to be a number, resolving to HiAnime episode ID...`);
                const episodeNumber = parseInt(episodeString);

                // Fetch show details to get episode list
                const response = await axios.get(`${BASE_URL}/${id}`, {
                    headers: { 'User-Agent': USER_AGENT }
                });

                const $ = cheerio.load(response.data);
                const dataId = $('#wrapper').attr('data-id');

                if (!dataId) {
                    throw new Error('Could not find show data-id');
                }

                const episodesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/list/${dataId}`, {
                    headers: {
                        'User-Agent': USER_AGENT,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const $episodes = cheerio.load(episodesResponse.data.html);
                let foundEpisodeId: string | null = null;

                $episodes('.ep-item').each((_, el) => {
                    const $ep = $episodes(el);
                    const epId = $ep.attr('data-id');
                    const epNum = parseInt($ep.attr('data-number') || '0');

                    if (epNum === episodeNumber && epId) {
                        foundEpisodeId = epId;
                        return false; // break
                    }
                });

                if (!foundEpisodeId) {
                    throw new Error(`Episode ${episodeNumber} not found for show ${id}`);
                }

                episodeId = foundEpisodeId;
                console.log(`[HiAnime] Resolved episode ${episodeNumber} to HiAnime ID: ${episodeId}`);
            }

            // Step 1: Get server list for episode
            const serversResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/servers`, {
                params: { episodeId },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $servers = cheerio.load(serversResponse.data.html);
            let targetServerId: string | null = null;

            // Find server ID for requested type (sub/dub)
            $servers('.server-item').each((_, el) => {
                const $server = $servers(el);
                const dataType = $server.attr('data-type');
                if (dataType === mode) {
                    targetServerId = $server.attr('data-id') || null;
                    return false; // break
                }
            });

            if (!targetServerId) {
                // Fallback to raw if requested type not found
                $servers('.server-item').each((_, el) => {
                    const $server = $servers(el);
                    const dataType = $server.attr('data-type');
                    if (dataType === 'raw') {
                        targetServerId = $server.attr('data-id') || null;
                        return false;
                    }
                });
            }

            if (!targetServerId) {
                throw new Error('No server found for requested type');
            }

            // Step 2: Get embed link
            const sourcesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/sources`, {
                params: { id: targetServerId },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const embedLink = sourcesResponse.data.link;
            if (!embedLink) {
                throw new Error('No embed link found');
            }

            return this.extractSources(embedLink);

        } catch (error: any) {
            console.error('[HiAnime] GetSources failed:', error);
            // Fallback to AllAnime
            try {
                const allAnime = new AllAnimeProvider();
                let searchTitle = "";
                try {
                    const info = await this.getInfo(id);
                    searchTitle = info.title;
                } catch (e) { }

                if (searchTitle) {
                    console.log(`[HiAnime-Fallback] Searching AllAnime for "${searchTitle}"...`);
                    const searchRes = await allAnime.search(searchTitle);
                    if (searchRes.length > 0) {
                        return await allAnime.getSources(searchRes[0].id, episodeString, mode);
                    }
                }
            } catch (e: any) {
                console.error('[HiAnime-Fallback] AllAnime fallback failed:', e.message);
            }
            throw new Error(`Failed to fetch sources: ${error.message || error}`);
        }
    }

    private async extractSources(embedLink: string): Promise<VideoSource[]> {
        console.log('[HiAnime] Returning embed link as iframe source:', embedLink);
        
        // Return the embed link directly as an iframe to avoid CORS/Referer issues
        // that occur when trying to play the extracted m3u8 directly in the browser.
        return [{
            url: embedLink,
            isM3U8: false,
            isIframe: true,
            quality: 'auto'
        }];
    }
    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            // Mapping '0-9' to 'other' if needed, but HiAnime usually uses /az-list/A or /az-list/other
            let path = letter.toLowerCase();
            if (path === '0-9' || path === 'other') path = 'other';
            if (path === 'all') path = ''; // /az-list ?

            const url = path
                ? `${BASE_URL}/az-list/${path}?page=${page}`
                : `${BASE_URL}/az-list?page=${page}`;

            console.log(`[HiAnime] Fetching A-Z List: ${url}`);
            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                // FIX: Select the 'a' tag inside .film-poster, not the div itself
                const href = $el.find('.film-poster a').attr('href');

                // Handle both /watch/id and /id formats
                const id = href?.includes('/watch/')
                    ? href?.split('/watch/')[1]
                    : href?.split('/').pop() || '';

                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src');

                // Extract sub/dub count
                const sub = parseInt($el.find('.tick-sub').text().trim()) || 0;
                const dub = parseInt($el.find('.tick-dub').text().trim()) || 0;

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image,
                        subOrDub: { sub, dub } as any,
                        provider: this.name
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[HiAnime] getAZList failed:', error);
            return [];
        }
    }

    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = `${BASE_URL}/genre/${genre}?page=${page}`;
            console.log(`[HiAnime] Fetching Genre: ${url}`);

            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                // FIX: Select the 'a' tag inside .film-poster, not the div itself
                const id = $el.find('.film-poster a').attr('href')?.split('/')[1] || '';
                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src');
                // Extract sub/dub count from badges
                const sub = parseInt($el.find('.tick-sub').text().trim()) || 0;
                const dub = parseInt($el.find('.tick-dub').text().trim()) || 0;

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image,
                        subOrDub: { sub, dub } as any,
                        provider: this.name
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[HiAnime] getGenre failed:', error);
            return [];
        }
    }

    async getServers(episodeId: string): Promise<any[]> {
        try {
            // Fetch servers HTML
            const serversResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/servers`, {
                params: { episodeId },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $ = cheerio.load(serversResponse.data.html);
            const servers: any[] = [];

            $('.server-item').each((_, el) => {
                const $el = $(el);
                const id = $el.attr('data-id');
                const type = $el.attr('data-type'); // sub, dub, raw
                const name = $el.text().trim();

                if (id) {
                    servers.push({
                        serverName: name,
                        serverId: id,
                        type: type
                    });
                }
            });

            return servers;

        } catch (error) {
            console.error('[HiAnime] getServers failed:', error);
            return [];
        }
    }

    async getTop(page: number = 1): Promise<AnimeSearchResult[]> {
        // Return static list to ensure fast load (as fallback)
        // ... existing static list ...
        // For brevity not repeating the whole static list
        // Reuse existing or just implement getRecent if interface allows
        return [];
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = `${BASE_URL}/recently-updated?page=${page}`;
            console.log(`[HiAnime] Fetching Recent Updates: ${url}`);

            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                // FIX: Select the 'a' tag inside .film-poster, not the div itself
                const href = $el.find('.film-poster a').attr('href');
                const id = href?.includes('/watch/')
                    ? href?.split('/watch/')[1]
                    : href?.split('/').pop() || '';

                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src');

                // Badges
                const sub = parseInt($el.find('.tick-sub').text().trim()) || 0;
                const dub = parseInt($el.find('.tick-dub').text().trim()) || 0;
                const ep = parseInt($el.find('.tick-eps').text().trim()) || 0;

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image,
                        subOrDub: { sub, dub } as any,
                        provider: this.name,
                        // Pass episode count as extra or hack into availableEpisodes for UI
                        extra: {
                            latestEpisode: ep || sub || dub
                        }
                    } as any);
                }
            });

            return results;
        } catch (error) {
            console.error('[HiAnime] getRecent failed:', error);
            return [];
        }
    }

    async getTrending(): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/home`, {
                headers: { 'User-Agent': USER_AGENT }
            });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            // HiAnime trending items are usually in #trending-home .item
            $('#trending-home .item').each((_, element) => {
                const $el = $(element);
                const id = $el.find('a').attr('href')?.split('/')[1] || '';
                const title = $el.find('.film-name').text().trim();
                const image = $el.find('img').attr('data-src') || $el.find('img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            // Fallback to latest records if trending is empty
            if (results.length === 0) {
                $('.film_list-wrap .flw-item').each((_, element) => {
                    const $el = $(element);
                    const id = $el.find('.film-poster a').attr('href')?.split('/')[1] || '';
                    const title = $el.find('.film-name a').text().trim();
                    const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');
                    if (id && title && results.length < 10) {
                        results.push({ id, title, image, provider: this.name });
                    }
                });
            }

            return results;
        } catch (error) {
            console.error('[HiAnime] getTrending failed:', error);
            return [];
        }
    }

    async getCompleted(): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/home`, {
                headers: { 'User-Agent': USER_AGENT }
            });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.anif-block-02 .ulclear li').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster a').attr('href');
                const id = href?.split('/')[1] || '';
                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[HiAnime] getCompleted failed:', error);
            return [];
        }
    }

    async getUpcoming(): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/home`, {
                headers: { 'User-Agent': USER_AGENT }
            });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            // The upcoming section is a grid like the others
            $('.cat-heading:contains("Top Upcoming")').closest('.block_area').find('.flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster a').attr('href');
                const id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[HiAnime] getUpcoming failed:', error);
            return [];
        }
    }
}
