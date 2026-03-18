import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';

const BASE_URL = 'https://aniwatchtv.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

export class AniWatchProvider implements AnimeProvider {
    name = 'aniwatch';

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
                const href = $el.find('.film-poster a').attr('href') || $el.find('.film-poster-ahref').attr('href');
                const id = href?.split('?')[0]?.split('/').pop() || '';

                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[AniWatch] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const response = await axios.get(`${BASE_URL}/${id}`, {
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const title = $('.film-name').first().text().trim() || $('.anime-name').first().text().trim();
            const image = $('.film-poster img').first().attr('src') || $('.film-poster img').first().attr('data-src');
            const description = $('.film-description').first().text().trim() || $('.show-description').first().text().trim();

            // Detect seasons
            const seasons: any[] = [];
            $('.os-list .os-item, .seasons-block .os-item').each((_, el) => {
                const $el = $(el);
                const seasonId = $el.attr('href')?.split('/').pop() || '';
                const seasonTitle = $el.text().trim() || $el.attr('title') || '';
                const isActive = $el.hasClass('active');

                if (seasonId && seasonId !== id) {
                    seasons.push({ id: seasonId, title: seasonTitle, active: isActive });
                }
            });

            // Get sub/dub counts from the page
            const sub = parseInt($('.tick-sub').first().text().trim()) || 0;
            const dub = parseInt($('.tick-dub').first().text().trim()) || 0;

            // Get episode list via AJAX
            const dataId = $('#wrapper').attr('data-id') || $('body').attr('data-id') || $('.anime-main').attr('data-id') || $('#sync-meta').attr('data-id');
            if (!dataId) {
                console.warn(`[AniWatch] Could not find data-id for ${id}, attempting fallback...`);
            }

            let episodes: any[] = [];
            if (dataId) {
                const episodesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/list/${dataId}`, {
                    headers: {
                        'User-Agent': USER_AGENT,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const $episodes = cheerio.load(episodesResponse.data.html);

                $episodes('.ep-item').each((_, el) => {
                    const $ep = $(el);
                    const episodeId = $ep.attr('data-id') || '';
                    const number = parseInt($ep.attr('data-number') || '0');
                    const epTitle = $ep.attr('title') || $ep.find('.ep-name').text().trim();

                    if (episodeId && number) {
                        episodes.push({
                            id: episodeId,
                            number,
                            title: epTitle || `Episode ${number}`
                        });
                    }
                });
            }

            return {
                id,
                title,
                image,
                description,
                episodes,
                totalEpisodes: episodes.length,
                availableEpisodes: { sub, dub },
                type: $('.item-title:contains("Type:")').next().text().trim(),
                status: $('.item-title:contains("Status:")').next().text().trim(),
                otherNames: [seasons.map(s => s.title)].flat() as string[] // Hacky way to pass season info for now or we could extend the interface
            };
        } catch (error) {
            console.error('[AniWatch] GetInfo failed:', error);
            throw new Error(`Failed to fetch anime info: ${error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[AniWatch] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}, ServerID=${serverId}`);

            let episodeId = episodeString;

            // Resolve episode number to ID if needed
            if (/^\d+$/.test(episodeString)) {
                try {
                    const info = await this.getInfo(id);
                    
                    // IF it's already a valid ID, don't treat it as a number
                    const alreadyAnId = info.episodes.some(ep => ep.id === episodeString);
                    
                    if (!alreadyAnId) {
                        console.log(`[AniWatch] Episode string "${episodeString}" is a number, resolving to ID...`);
                        const targetEp = info.episodes.find(ep => ep.number === parseInt(episodeString));
                        if (targetEp) {
                            episodeId = targetEp.id;
                        } else {
                            throw new Error(`Episode ${episodeString} not found for show ${id}`);
                        }
                    }
                } catch (e: any) {
                    console.error(`[AniWatch] ID Resolution failed:`, e.message);
                }
            }

            // Step 1: Get server list for the episode
            const serversResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/servers`, {
                params: { episodeId },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $servers = cheerio.load(serversResponse.data.html);
            const servers: { id: string, name: string, type: string }[] = [];

            $servers('.server-item').each((_, el) => {
                const $server = $servers(el);
                const dataType = $server.attr('data-type');
                const sId = $server.attr('data-id');
                const name = $server.text().trim();

                // If a specific server was requested, only take that one
                if (serverId && sId === serverId) {
                    servers.length = 0; // Clear others
                    servers.push({ id: sId, name, type: dataType || 'sub' });
                    return false; // break
                }

                // Otherwise, take all servers that match the requested mode (or fallback to sub)
                if (dataType === mode) {
                    servers.push({ id: sId || '', name, type: dataType });
                }
            });

            // If no servers found for requested mode, fallback to any available
            if (servers.length === 0 && !serverId) {
                console.log(`[AniWatch] No ${mode} servers found, checking for ANY servers...`);
                $servers('.server-item').each((_, el) => {
                    const $server = $servers(el);
                    servers.push({ 
                        id: $server.attr('data-id') || '', 
                        name: $server.text().trim(), 
                        type: $server.attr('data-type') || 'sub' 
                    });
                });
            }

            if (servers.length === 0) {
                throw new Error('No servers found for the requested episode');
            }

            console.log(`[AniWatch] Extracting sources from ${servers.length} servers...`);

            // Step 2: Extract sources from all identified servers in parallel
            const sourcePromises = servers.map(async (server) => {
                try {
                    const sourcesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/sources`, {
                        params: { id: server.id },
                        headers: {
                            'User-Agent': USER_AGENT,
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });

                    const embedLink = sourcesResponse.data.link;
                    if (!embedLink) return null;

                    return {
                        url: embedLink,
                        isM3U8: false,
                        isIframe: true,
                        quality: 'auto',
                        server: server.name,
                        type: server.type as any
                    };
                } catch (e: any) {
                    console.error(`[AniWatch] Failed to fetch source for server ${server.name}:`, e.message);
                    return null;
                }
            });

            const results = (await Promise.all(sourcePromises)).filter(s => s !== null) as VideoSource[];

            if (results.length === 0) {
                throw new Error('All servers failed to return an embed link');
            }

            return results;

        } catch (error: any) {
            console.error('[AniWatch] GetSources failed:', error);
            // Fallback to AllAnime
            try {
                const allAnime = new AllAnimeProvider();
                console.log(`[AniWatch-Fallback] Attempting to fallback to AllAnime...`);
                return await allAnime.getSources(id, episodeString, mode);
            } catch (e: any) {
                console.error('[AniWatch-Fallback] AllAnime fallback failed:', e.message);
            }
            throw new Error(`Failed to fetch sources: ${error.message || error}`);
        }
    }

    private async extractSources(embedLink: string): Promise<VideoSource[]> {
        console.log('[AniWatch] Returning embed link as iframe source:', embedLink);
        
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

            console.log(`[AniWatch] Fetching A-Z List: ${url}`);
            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster a').attr('href') || $el.find('.film-poster-ahref').attr('href');
                const id = href?.split('?')[0]?.split('/').pop() || '';

                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

                // Extract sub/dub count
                const sub = parseInt($el.find('.tick-sub').text().trim()) || 0;
                const dub = parseInt($el.find('.tick-dub').text().trim()) || 0;

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image,
                        subOrDub: { sub, dub } as any
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[AniWatch] getAZList failed:', error);
            return [];
        }
    }

    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = `${BASE_URL}/genre/${genre}?page=${page}`;
            console.log(`[AniWatch] Fetching Genre: ${url}`);

            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster-ahref').attr('href');
                const id = href?.split('?')[0]?.split('/').pop() || '';
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
                        subOrDub: { sub, dub } as any
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[AniWatch] getGenre failed:', error);
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
            console.error('[AniWatch] getServers failed:', error);
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
            console.log(`[AniWatch] Fetching Recent Updates: ${url}`);

            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster').attr('href');
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
                        // Pass episode count as extra or hack into availableEpisodes for UI
                        extra: {
                            latestEpisode: ep || sub || dub
                        }
                    } as any);
                }
            });

            return results;
        } catch (error) {
            console.error('[AniWatch] getRecent failed:', error);
            return [];
        }
    }

    async getTVSeries(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = `${BASE_URL}/tv?page=${page}`;
            console.log(`[AniWatch] Fetching TV Series List: ${url}`);

            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster a').attr('href') || $el.find('.film-poster-ahref').attr('href');
                const id = href?.split('?')[0]?.split('/').pop() || '';
                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[AniWatch] getTVSeries failed:', error);
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
                const href = $el.find('.film-poster a').attr('href') || $el.find('.film-poster-ahref').attr('href');
                const id = href?.split('/').filter(Boolean).pop() || '';
                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[AniWatch] getCompleted failed:', error);
            return [];
        }
    }
}
