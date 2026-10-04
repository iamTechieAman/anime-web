import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';
import { ParserError, safeString, safeInt, isValidUrl, sanitizeUrl } from './parser-utils';

export const ANIWATCH_MIRRORS = [
    'https://aniwatchtv.to',
    'https://hianime.to',
    'https://aniwatch.to',
    'https://zoro.to',
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

export class AniWatchProvider implements AnimeProvider {
    name = 'aniwatch';

    /**
     * Executes requests with dynamic mirror auto-switching and a strict 10s timeout.
     */
    private async fetchFromMirrors(path: string, options: AxiosRequestConfig = {}): Promise<{ data: any; mirror: string }> {
        const errors: string[] = [];
        for (const mirror of ANIWATCH_MIRRORS) {
            const url = path.startsWith('http') ? path : `${mirror}${path.startsWith('/') ? path : `/${path}`}`;
            try {
                const response = await axios({
                    url,
                    timeout: 10000, // 10s timeout
                    ...options,
                    headers: {
                        'User-Agent': USER_AGENT,
                        'Referer': `${mirror}/`,
                        'Origin': mirror,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        ...(options.headers || {})
                    }
                });
                if (response.data) {
                    return { data: response.data, mirror };
                }
            } catch (err: any) {
                errors.push(`${mirror}: ${err.message || 'Error'}`);
            }
        }
        throw new Error(`[AniWatch] All mirrors failed for path "${path}": ${errors.join(' | ')}`);
    }

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const cleanQuery = query.trim();
            if (!cleanQuery) return [];

            const { data } = await this.fetchFromMirrors(`/search?keyword=${encodeURIComponent(cleanQuery)}`);
            if (!data || typeof data !== 'string') return [];

            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item, .film_list-wrap .item, .aitem').each((_, element) => {
                const $el = $(element);
                const $link = $el.find('.film-poster a, .film-poster-ahref, a.film-poster, a').first();
                const href = $link.attr('href') || $el.find('a').first().attr('href') || '';
                const id = href?.split('?')[0]?.split('/').filter(Boolean).pop() || '';

                const title = $el.find('.film-name a, .film-name, .dynamic-name, h3.film-name').first().text().trim()
                    || $link.attr('title') || '';
                const $img = $el.find('.film-poster img, img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                const sub = safeInt($el.find('.tick-sub').text().trim(), 0);
                const dub = safeInt($el.find('.tick-dub').text().trim(), 0);

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image: sanitizeUrl(image),
                        provider: this.name,
                        subOrDub: (sub > 0 && dub > 0) ? 'both' : (dub > 0 ? 'dub' : 'sub')
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error('[AniWatch] Search failed across all mirrors:', error.message);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const cleanId = id.replace(/^\//, '').split('?')[0];
            const { data } = await this.fetchFromMirrors(`/${cleanId}`);

            if (!data || typeof data !== 'string') {
                throw new ParserError(this.name, 'getInfo', id, 'Received empty HTML response');
            }

            const $ = cheerio.load(data);
            const title = $('.film-name, .anime-name, h2.film-name, .heading-large, .dynamic-name, h1').first().text().trim();
            const $img = $('.film-poster img, .anisc-poster img, .poster img').first();
            const image = $img.attr('data-src') || $img.attr('src') || '';
            const description = $('.film-description, .show-description, .anisc-info .text, .film-detail .text').first().text().trim();

            // Detect seasons
            const seasons: any[] = [];
            $('.os-list .os-item, .seasons-block .os-item').each((_, el) => {
                const $el = $(el);
                const seasonId = $el.attr('href')?.split('/').filter(Boolean).pop() || '';
                const seasonTitle = $el.text().trim() || $el.attr('title') || '';
                const isActive = $el.hasClass('active');

                if (seasonId && seasonId !== cleanId) {
                    seasons.push({ id: seasonId, title: seasonTitle, active: isActive });
                }
            });

            // Get sub/dub counts
            const sub = safeInt($('.tick-sub').first().text().trim(), 0);
            const dub = safeInt($('.tick-dub').first().text().trim(), 0);

            // Get episode list via AJAX data-id
            const dataId = $('#wrapper').attr('data-id')
                || $('body').attr('data-id')
                || $('.anime-main').attr('data-id')
                || $('#sync-meta').attr('data-id')
                || $('[data-id]').first().attr('data-id');

            let episodes: any[] = [];
            if (dataId) {
                try {
                    const epRes = await this.fetchFromMirrors(`/ajax/v2/episode/list/${dataId}`, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });

                    const epHtml = epRes.data?.html || (typeof epRes.data === 'string' ? epRes.data : '');
                    if (epHtml) {
                        const $episodes = cheerio.load(epHtml);
                        $episodes('.ep-item, .ssl-item, .ep-page-item, a.item').each((_, el) => {
                            const $ep = $episodes(el);
                            const episodeId = $ep.attr('data-id') || $ep.attr('data-number') || '';
                            const number = safeInt($ep.attr('data-number') || $ep.text().replace(/[^\d]/g, ''), 0);
                            const epTitle = $ep.attr('title') || $ep.find('.ep-name').text().trim() || `Episode ${number}`;

                            if (episodeId && number > 0) {
                                episodes.push({
                                    id: episodeId,
                                    number,
                                    title: epTitle
                                });
                            }
                        });
                    }
                } catch (e: any) {
                    console.warn(`[AniWatch] Episode list fetch failed for ${id}:`, e.message);
                }
            }

            return {
                id: cleanId,
                title: title || cleanId,
                image: sanitizeUrl(image),
                description,
                episodes,
                totalEpisodes: episodes.length,
                availableEpisodes: { sub, dub },
                type: $('.item-title:contains("Type:")').next().text().trim() || 'TV',
                status: $('.item-title:contains("Status:")').next().text().trim() || 'Completed',
                otherNames: [seasons.map(s => s.title)].flat() as string[]
            };
        } catch (error: any) {
            console.error('[AniWatch] GetInfo failed across all mirrors:', error.message);
            throw error;
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[AniWatch] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}, ServerID=${serverId}`);

            let episodeId = episodeString;

            // Resolve episode number to ID if numeric
            if (/^\d+$/.test(episodeString)) {
                try {
                    const info = await this.getInfo(id);
                    const alreadyAnId = info.episodes.some(ep => ep.id === episodeString);
                    if (!alreadyAnId) {
                        const targetEp = info.episodes.find(ep => ep.number === parseInt(episodeString));
                        if (targetEp) {
                            episodeId = targetEp.id;
                        }
                    }
                } catch (e: any) {
                    console.warn(`[AniWatch] ID Resolution failed:`, e.message);
                }
            }

            // Step 1: Get server list for the episode
            const serversResponse = await this.fetchFromMirrors(`/ajax/v2/episode/servers?episodeId=${encodeURIComponent(episodeId)}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const html = typeof serversResponse.data === 'string' ? serversResponse.data : serversResponse.data?.html || '';
            const $servers = cheerio.load(html);
            const servers: { id: string, name: string, type: string }[] = [];

            $servers('.server-item, .ps_-block .btn-server, .servers-sub .server-item, .servers-dub .server-item').each((_, el) => {
                const $server = $servers(el);
                const dataType = $server.attr('data-type') || ($server.closest('.servers-dub').length > 0 ? 'dub' : 'sub');
                const sId = $server.attr('data-id') || $server.attr('data-server-id');
                const name = $server.text().trim() || $server.attr('title') || 'Server';

                if (serverId && sId === serverId) {
                    servers.length = 0;
                    servers.push({ id: sId, name, type: dataType });
                    return false;
                }

                if (dataType === mode) {
                    servers.push({ id: sId || '', name, type: dataType });
                }
            });

            if (servers.length === 0 && !serverId) {
                $servers('.server-item, .ps_-block .btn-server').each((_, el) => {
                    const $server = $servers(el);
                    const sId = $server.attr('data-id') || $server.attr('data-server-id');
                    if (sId) {
                        servers.push({
                            id: sId,
                            name: $server.text().trim() || 'Server',
                            type: $server.attr('data-type') || 'sub'
                        });
                    }
                });
            }

            if (servers.length === 0) {
                throw new Error('No servers found for requested episode');
            }

            // Step 2: Extract sources from all identified servers in parallel
            const sourcePromises = servers.map(async (server) => {
                try {
                    const sourcesResponse = await this.fetchFromMirrors(`/ajax/v2/episode/sources?id=${encodeURIComponent(server.id)}`, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });

                    const embedLink = sourcesResponse.data?.link || sourcesResponse.data?.url || sourcesResponse.data?.html;
                    if (!embedLink || typeof embedLink !== 'string') return null;

                    return {
                        url: embedLink,
                        isM3U8: embedLink.includes('.m3u8'),
                        isIframe: !embedLink.includes('.m3u8'),
                        quality: 'auto',
                        server: server.name,
                        type: server.type as any
                    };
                } catch (e: any) {
                    console.warn(`[AniWatch] Failed to fetch source for server ${server.name}:`, e.message);
                    return null;
                }
            });

            const results = (await Promise.all(sourcePromises)).filter(s => s !== null) as VideoSource[];
            if (results.length > 0) {
                return results;
            }

            throw new Error('All servers failed to return an embed link');
        } catch (error: any) {
            console.warn('[AniWatch] GetSources failed across mirrors, falling back to AllAnime:', error.message);
            try {
                const allAnime = new AllAnimeProvider();
                return await allAnime.getSources(id, episodeString, mode);
            } catch (e: any) {
                console.error('[AniWatch-Fallback] AllAnime fallback also failed:', e.message);
            }
            return []; // Clean fallback array without crashing API
        }
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            let path = letter.toLowerCase();
            if (path === '0-9' || path === 'other') path = 'other';
            const endpoint = (path === 'all' || !path) ? `/az-list?page=${page}` : `/az-list/${path}?page=${page}`;

            const { data } = await this.fetchFromMirrors(endpoint);
            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item, .film_list-wrap .item, .aitem').each((_, element) => {
                const $el = $(element);
                const $link = $el.find('.film-poster a, .film-poster-ahref, a').first();
                const href = $link.attr('href') || '';
                const id = href?.split('?')[0]?.split('/').filter(Boolean).pop() || '';
                const title = $el.find('.film-name a, .dynamic-name, h3').first().text().trim();
                const $img = $el.find('.film-poster img, img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                const sub = safeInt($el.find('.tick-sub').text().trim(), 0);
                const dub = safeInt($el.find('.tick-dub').text().trim(), 0);

                if (id && title) {
                    results.push({ id, title, image: sanitizeUrl(image), subOrDub: { sub, dub } as any });
                }
            });

            return results;
        } catch (error: any) {
            console.error('[AniWatch] getAZList failed:', error.message);
            return [];
        }
    }

    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const { data } = await this.fetchFromMirrors(`/genre/${genre}?page=${page}`);
            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item, .film_list-wrap .item, .aitem').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster-ahref, .film-poster a, a').first().attr('href') || '';
                const id = href?.split('?')[0]?.split('/').filter(Boolean).pop() || '';
                const title = $el.find('.film-name a, .dynamic-name, h3').first().text().trim();
                const $img = $el.find('.film-poster img, img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                const sub = safeInt($el.find('.tick-sub').text().trim(), 0);
                const dub = safeInt($el.find('.tick-dub').text().trim(), 0);

                if (id && title) {
                    results.push({ id, title, image: sanitizeUrl(image), subOrDub: { sub, dub } as any });
                }
            });

            return results;
        } catch (error: any) {
            console.error('[AniWatch] getGenre failed:', error.message);
            return [];
        }
    }

    async getServers(episodeId: string): Promise<any[]> {
        try {
            const { data } = await this.fetchFromMirrors(`/ajax/v2/episode/servers?episodeId=${encodeURIComponent(episodeId)}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const html = typeof data === 'string' ? data : data?.html || '';
            const $ = cheerio.load(html);
            const servers: any[] = [];

            $('.server-item, .ps_-block .btn-server').each((_, el) => {
                const $el = $(el);
                const id = $el.attr('data-id') || $el.attr('data-server-id');
                const type = $el.attr('data-type') || ($el.closest('.servers-dub').length > 0 ? 'dub' : 'sub');
                const name = $el.text().trim() || $el.attr('title') || 'Server';

                if (id) {
                    servers.push({
                        serverName: name,
                        serverId: id,
                        type: type
                    });
                }
            });

            return servers;
        } catch (error: any) {
            console.error('[AniWatch] getServers failed:', error.message);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const { data } = await this.fetchFromMirrors(`/recently-updated?page=${page}`);
            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item, .film_list-wrap .item, .aitem').each((_, element) => {
                const $el = $(element);
                const $link = $el.find('.film-poster, .film-poster a, a').first();
                const href = $link.attr('href') || '';
                const id = href?.includes('/watch/')
                    ? href.split('/watch/')[1]?.split('?')[0]
                    : href.split('/').filter(Boolean).pop() || '';

                const title = $el.find('.film-name a, .dynamic-name, h3').first().text().trim();
                const $img = $el.find('.film-poster img, img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                const sub = safeInt($el.find('.tick-sub').text().trim(), 0);
                const dub = safeInt($el.find('.tick-dub').text().trim(), 0);
                const ep = safeInt($el.find('.tick-eps').text().trim(), 0);

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image: sanitizeUrl(image),
                        subOrDub: { sub, dub } as any,
                        extra: { latestEpisode: ep || sub || dub }
                    } as any);
                }
            });

            return results;
        } catch (error: any) {
            console.error('[AniWatch] getRecent failed:', error.message);
            return [];
        }
    }

    async getTVSeries(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const { data } = await this.fetchFromMirrors(`/tv?page=${page}`);
            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item, .film_list-wrap .item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster a, .film-poster-ahref, a').first().attr('href') || '';
                const id = href?.split('?')[0]?.split('/').filter(Boolean).pop() || '';
                const title = $el.find('.film-name a, .dynamic-name, h3').first().text().trim();
                const $img = $el.find('.film-poster img, img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                if (id && title) {
                    results.push({ id, title, image: sanitizeUrl(image), provider: this.name });
                }
            });

            return results;
        } catch (error: any) {
            console.error('[AniWatch] getTVSeries failed:', error.message);
            return [];
        }
    }

    async getCompleted(): Promise<AnimeSearchResult[]> {
        try {
            const { data } = await this.fetchFromMirrors(`/home`);
            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.anif-block-02 .ulclear li, .film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster a, .film-poster-ahref, a').first().attr('href') || '';
                const id = href?.split('?')[0]?.split('/').filter(Boolean).pop() || '';
                const title = $el.find('.film-name a, .dynamic-name, h3').first().text().trim();
                const $img = $el.find('.film-poster img, img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                if (id && title) {
                    results.push({ id, title, image: sanitizeUrl(image), provider: this.name });
                }
            });

            return results;
        } catch (error: any) {
            console.error('[AniWatch] getCompleted failed:', error.message);
            return [];
        }
    }
}
