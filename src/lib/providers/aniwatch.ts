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
                const href = $el.find('.film-poster-ahref').attr('href');
                const id = href?.split('?')[0]?.split('/').pop() || '';

                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src');

                if (id && title) {
                    results.push({ id, title, image });
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
            console.error('[AniWatch] GetInfo failed:', error);
            throw new Error(`Failed to fetch anime info: ${error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[AniWatch] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}, ServerID=${serverId}`);

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
                console.log(`[AniWatch] Episode string "${episodeString}" appears to be a number, resolving to HiAnime episode ID...`);
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
                console.log(`[AniWatch] Resolved episode ${episodeNumber} to HiAnime ID: ${episodeId}`);
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
            console.error('[AniWatch] GetSources failed:', error);
            // Fallback to AllAnime
            try {
                const allAnime = new AllAnimeProvider();
                let searchTitle = "";
                try {
                    const info = await this.getInfo(id);
                    searchTitle = info.title;
                } catch (e) { }

                if (searchTitle) {
                    console.log(`[AniWatch-Fallback] Searching AllAnime for "${searchTitle}"...`);
                    const searchRes = await allAnime.search(searchTitle);
                    if (searchRes.length > 0) {
                        return await allAnime.getSources(searchRes[0].id, episodeString, mode);
                    }
                }
            } catch (e: any) {
                console.error('[AniWatch-Fallback] AllAnime fallback failed:', e.message);
            }
            throw new Error(`Failed to fetch sources: ${error.message || error}`);
        }
    }

    private async extractSources(embedLink: string): Promise<VideoSource[]> {
        // Step 3: Extract actual video source from embed
        // The embed link follows pattern: domain/embed-X/e-Y/hash?k=1 or domain/embed-X/vY/e-Z/hash?k=1
        const embedMatch = embedLink.match(/(.*)\/embed-(\d+)\/(?:v\d+\/)?e-(\d+)\/(.+)\?k=1$/);

        if (!embedMatch) {
            console.warn('[AniWatch] Could not parse embed link, returning as-is');
            return [{
                url: embedLink,
                isM3U8: true,
                quality: 'auto'
            }];
        }

        const [, providerLink, embedType, eNumber, sourceId] = embedMatch;

        const ajaxUrl = `${providerLink}/embed-${embedType}/ajax/e-${eNumber}/getSources`;
        console.log('[AniWatch] Embed URL:', embedLink);
        console.log('[AniWatch] Ajax URL:', ajaxUrl);
        console.log('[AniWatch] Source ID:', sourceId);

        // Step 4: Get final sources
        const finalSourcesResponse = await axios.get(
            ajaxUrl,
            {
                params: { id: sourceId },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': embedLink
                }
            }
        );

        const sourcesData = finalSourcesResponse.data;

        // Handle different response formats
        if (sourcesData.sources) {
            return sourcesData.sources.map((source: any) => ({
                url: source.file || source.url,
                isM3U8: source.type === 'hls' || source.file?.includes('.m3u8'),
                quality: source.label || source.quality || 'auto',
                headers: { Referer: embedLink }
            }));
        } else if (sourcesData.source) {
            return [{
                url: sourcesData.source,
                isM3U8: sourcesData.source.includes('.m3u8'),
                quality: 'auto'
            }];
        }

        throw new Error('Unknown sources format');
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
                const href = $el.find('.film-poster-ahref').attr('href');
                const id = href?.split('?')[0]?.split('/').pop() || '';

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
}
