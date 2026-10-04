import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';
import { HiAnimeProvider } from './hianime';
import { ParserError, safeString, safeInt, isValidUrl, sanitizeUrl } from './parser-utils';

export const ANIKAI_MIRRORS = [
    'https://anikai.to',
    'https://anikai.cc',
    'https://aniwatchtv.to',
    'https://hianime.to'
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

export class AnikaiProvider implements AnimeProvider {
    name = 'anikai';

    /**
     * Executes requests across working mirrors with automatic failover and 10s timeout.
     */
    private async fetchFromMirrors(path: string, options: AxiosRequestConfig = {}): Promise<{ data: any; mirror: string }> {
        const errors: string[] = [];
        for (const mirror of ANIKAI_MIRRORS) {
            const url = path.startsWith('http') ? path : `${mirror}${path.startsWith('/') ? path : `/${path}`}`;
            try {
                const response = await axios({
                    url,
                    timeout: 10000,
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
        throw new Error(`[Anikai] All mirrors failed for path "${path}": ${errors.join(' | ')}`);
    }

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const cleanQuery = query.trim();
            if (!cleanQuery) return [];

            const { data } = await this.fetchFromMirrors(`/browser?keyword=${encodeURIComponent(cleanQuery)}`);
            if (!data || typeof data !== 'string') return [];

            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item, .film_list-wrap .item, .aitem').each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster, .film-poster, .film-poster-ahref, a').first();
                const href = $poster.attr('href') || $el.find('a').first().attr('href') || '';

                const id = href?.includes('/watch/')
                    ? href.split('/watch/')[1]?.split('?')[0]
                    : href.split('?')[0]?.split('/').filter(Boolean).pop() || '';

                const title = $el.find('.title, .film-name a, .film-name, .dynamic-name, h3.film-name').first().text().trim()
                    || $poster.attr('title') || '';
                const $img = $el.find('img').first();
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
            console.error('[Anikai] Search failed across all mirrors:', error.message);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const { data } = await this.fetchFromMirrors(page > 1 ? `/home?page=${page}` : '/home');
            if (!data || typeof data !== 'string') return [];

            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('#latest-updates .tab-body .aitem, .film_list-wrap .flw-item, .aitem').each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster, .film-poster').first();

                const href = $poster.attr('href') || $el.find('a').first().attr('href') || '';
                let id = href?.includes('/watch/')
                    ? href.split('/watch/')[1]?.split('?')[0]
                    : href.split('?')[0]?.split('/').filter(Boolean).pop() || '';

                if (id.includes('#')) id = id.split('#')[0];

                const title = $el.find('.title, .film-name a, .film-name').first().text().trim();
                const $img = $el.find('img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';
                const epText = $el.find('.ep-status, .tick-sub, .tick-dub').first().text().trim();

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image: sanitizeUrl(image),
                        provider: this.name,
                        extra: {
                            latestEpisode: epText
                        }
                    } as any);
                }
            });

            return results;
        } catch (error: any) {
            console.error('[Anikai] getRecent failed across all mirrors:', error.message);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const cleanId = id.replace(/^\//, '').split('?')[0];
            const path = cleanId.startsWith('watch/') ? `/${cleanId}` : `/watch/${cleanId}`;
            const { data } = await this.fetchFromMirrors(path);

            if (!data || typeof data !== 'string') {
                throw new ParserError(this.name, 'getInfo', id, 'Received empty or invalid HTML response');
            }

            const $ = cheerio.load(data);
            const title = $('h1.title, .film-name, h1.film-name, .anime-name, .dynamic-name, h1').first().text().trim();
            const $img = $('.poster img, .film-poster img, .anisc-poster img').first();
            const image = $img.attr('data-src') || $img.attr('src') || '';
            const description = $('.desc, .film-description, .show-description, .film-detail .text').first().text().trim();

            // Get episode list via AJAX data-id
            let dataId = $('#wrapper').attr('data-id')
                || $('body').attr('data-id')
                || $('#anime-rating').attr('data-id')
                || $('.user-bookmark').attr('data-id')
                || $('.w2g-trigger').attr('data-id')
                || $('#sync-meta').attr('data-id')
                || $('[data-id]').first().attr('data-id');

            if (!dataId) {
                try {
                    const syncData = JSON.parse($('#syncData').html() || '{}');
                    dataId = syncData.anime_id;
                } catch {
                    // ignore
                }
            }

            const episodes: any[] = [];

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
                    console.warn('[Anikai] Episode list AJAX fetch failed:', e.message);
                }
            }

            // Fallback logic for episodes to AllAnime
            if (episodes.length === 0 && title) {
                console.warn('[Anikai] No episodes parsed, attempting fallback to AllAnime...');
                try {
                    const allAnime = new AllAnimeProvider();
                    const searchRes = await allAnime.search(title);
                    if (searchRes.length > 0) {
                        return await allAnime.getInfo(searchRes[0].id);
                    }
                } catch { }
            }

            return {
                id,
                title: title || id,
                image: sanitizeUrl(image),
                description,
                episodes,
                totalEpisodes: episodes.length
            };
        } catch (error: any) {
            console.error('[Anikai] GetInfo failed:', error.message);
            // Fallback to AllAnime on complete failure
            try {
                const allAnime = new AllAnimeProvider();
                const searchRes = await allAnime.search(id);
                if (searchRes.length > 0) {
                    return await allAnime.getInfo(searchRes[0].id);
                }
            } catch { }
            throw new Error(`Failed to fetch anime info: ${error.message || error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[Anikai] Fetching sources: ID=${id}, Ep=${episodeString}, Mode=${mode}, ServerId=${serverId}`);

            // If ID matches AllAnime format (long alphanumeric without dashes), try AllAnime first
            if (id.length > 10 && !id.includes('-')) {
                try {
                    return await new AllAnimeProvider().getSources(id, episodeString, mode);
                } catch { }
            }

            if (serverId) {
                const sourcesResponse = await this.fetchFromMirrors(`/ajax/v2/episode/sources?id=${encodeURIComponent(serverId)}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const embedLink = sourcesResponse.data?.link;
                if (!embedLink) throw new Error('No embed link found for provided serverId');
                return this.extractSources(embedLink);
            }

            // Step 1: Query server list
            const serversResponse = await this.fetchFromMirrors(`/ajax/v2/episode/servers?episodeId=${encodeURIComponent(episodeString)}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const serversHtml = serversResponse.data?.html || (typeof serversResponse.data === 'string' ? serversResponse.data : '');
            if (!serversHtml) {
                throw new Error('No server list returned from API');
            }

            const $servers = cheerio.load(serversHtml);
            let targetServerId: string | null = null;

            $servers('.server-item, .btn-server').each((_, el) => {
                const $server = $servers(el);
                const dataType = $server.attr('data-type') || $server.attr('data-subdub');
                if (dataType === mode) {
                    targetServerId = $server.attr('data-id') || null;
                    return false;
                }
            });

            if (!targetServerId) {
                targetServerId = $servers('.server-item, .btn-server').first().attr('data-id') || null;
            }

            if (!targetServerId) throw new Error('No server found for episode');

            // Step 2: Get embed link
            const sourcesResponse = await this.fetchFromMirrors(`/ajax/v2/episode/sources?id=${encodeURIComponent(targetServerId)}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const embedLink = sourcesResponse.data?.link;
            if (!embedLink) throw new Error('No embed link found');

            return this.extractSources(embedLink);
        } catch (error: any) {
            console.error('[Anikai] GetSources failed:', error.message);
            // Fallback to AllAnime
            try {
                const allAnime = new AllAnimeProvider();
                let fallbackId = id;
                let searchTitle = '';

                try {
                    const info = await this.getInfo(id);
                    searchTitle = info.title;
                    if (info.id && info.id.length > 10 && !info.id.includes('-')) {
                        fallbackId = info.id;
                    }
                } catch { }

                if (searchTitle) {
                    const searchRes = await allAnime.search(searchTitle);
                    if (searchRes.length > 0) fallbackId = searchRes[0].id;
                }

                return await allAnime.getSources(fallbackId, episodeString, mode);
            } catch (fallbackErr: any) {
                console.error('[Anikai-Fallback] AllAnime fallback failed:', fallbackErr.message);
            }

            return [];
        }
    }

    private async extractSources(embedLink: string): Promise<VideoSource[]> {
        const embedMatch = embedLink.match(/(.*)\/embed-(\d+)\/(?:v\d+\/)?e-(\d+)\/(.+)\?k=1$/);

        if (!embedMatch) {
            return [{
                url: embedLink,
                isM3U8: embedLink.includes('.m3u8'),
                quality: 'auto',
                isIframe: true,
                server: 'Anikai Embed'
            }];
        }

        const [, providerLink, embedType, eNumber, sourceId] = embedMatch;
        const ajaxUrl = `${providerLink}/embed-${embedType}/ajax/e-${eNumber}/getSources`;

        try {
            const finalSourcesResponse = await axios.get(ajaxUrl, {
                params: { id: sourceId },
                timeout: 10000,
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': embedLink
                }
            });

            const sourcesData = finalSourcesResponse.data;
            if (!sourcesData || typeof sourcesData !== 'object') {
                return [{
                    url: embedLink,
                    isM3U8: false,
                    quality: 'auto',
                    isIframe: true,
                    server: 'Anikai Embed'
                }];
            }

            if (Array.isArray(sourcesData.sources)) {
                const list: VideoSource[] = [];
                for (const source of sourcesData.sources) {
                    const sUrl = source?.file || source?.url;
                    if (isValidUrl(sUrl)) {
                        list.push({
                            url: sanitizeUrl(sUrl),
                            isM3U8: source.type === 'hls' || sUrl.includes('.m3u8'),
                            quality: source.label || source.quality || 'auto',
                            headers: { Referer: embedLink }
                        });
                    }
                }
                if (list.length > 0) return list;
            } else if (isValidUrl(sourcesData.source)) {
                const sUrl = sanitizeUrl(sourcesData.source);
                return [{
                    url: sUrl,
                    isM3U8: sUrl.includes('.m3u8'),
                    quality: 'auto'
                }];
            }
        } catch { }

        return [{
            url: embedLink,
            isM3U8: false,
            quality: 'auto',
            isIframe: true,
            server: 'Anikai Embed'
        }];
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            let path = letter.toLowerCase();
            if (path === '0-9' || path === 'other') path = 'other';
            if (path === 'all') path = '';

            const urlPath = path
                ? `/az-list/${path}?page=${page}`
                : `/az-list?page=${page}`;

            const { data } = await this.fetchFromMirrors(urlPath);
            const $ = cheerio.load(data);
            const results: AnimeSearchResult[] = [];

            $('.film_list-wrap .flw-item, .film_list-wrap .item, .aitem').each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster, .film-poster').first();
                const href = $poster.attr('href') || $el.find('a').first().attr('href') || '';
                const id = href?.includes('/watch/')
                    ? href.split('/watch/')[1]?.split('?')[0]
                    : href.split('?')[0]?.split('/').filter(Boolean).pop() || '';

                const title = $el.find('.title, .film-name a, .film-name').first().text().trim();
                const $img = $poster.find('img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                const sub = safeInt($el.find('.tick-sub').text().trim(), 0);
                const dub = safeInt($el.find('.tick-dub').text().trim(), 0);

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image: sanitizeUrl(image) || `https://img.anikai.to/i/cache/images/${id}.jpg`,
                        subOrDub: (sub > 0 && dub > 0) ? 'both' : (dub > 0 ? 'dub' : 'sub'),
                        provider: this.name
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error('[Anikai] getAZList failed across all mirrors:', error.message);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            let html = '';
            try {
                const res = await this.fetchFromMirrors('/ajax/home/items?name=trending', {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                html = res.data?.result || res.data?.html || (typeof res.data === 'string' ? res.data : '');
            } catch {
                const homeRes = await this.fetchFromMirrors('/home');
                html = homeRes.data;
            }

            if (!html) return [];
            const $ = cheerio.load(html);
            const results: AnimeSearchResult[] = [];

            $('.aitem, .flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.attr('href') || $el.find('a').first().attr('href') || '';
                let id = href?.includes('/watch/')
                    ? href.split('/watch/')[1]?.split('?')[0]
                    : href.split('?')[0]?.split('/').filter(Boolean).pop() || '';

                if (id.includes('#')) id = id.split('#')[0];
                const title = $el.find('.title, .film-name').first().text().trim();

                const style = $el.attr('style') || $el.find('.poster').attr('style') || '';
                let image = '';
                if (style.includes('url(')) {
                    image = style.split('url(')[1].split(')')[0].replace(/['"]/g, '');
                }
                if (!image) {
                    const $img = $el.find('img').first();
                    image = $img.attr('data-src') || $img.attr('src') || '';
                }

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image: sanitizeUrl(image) || `https://img.anikai.to/i/cache/images/${id}.jpg`,
                        provider: this.name
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error('[Anikai] getTrending failed:', error.message);
            return [];
        }
    }

    async getTop(page: number = 1): Promise<AnimeSearchResult[]> {
        return this.getTrending(page);
    }

    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
        return [];
    }

    async getHome(): Promise<{ slides: AnimeSearchResult[]; trending: AnimeSearchResult[]; latest: AnimeSearchResult[]; completed: AnimeSearchResult[]; upcoming: AnimeSearchResult[] }> {
        try {
            const { data } = await this.fetchFromMirrors('/home');
            const $ = cheerio.load(data);
            const slides: AnimeSearchResult[] = [];

            let slideElements = $('.swiper-wrapper .swiper-slide, .deslide-item, #slider .item, .film-slider .swiper-slide');

            slideElements.each((_, el) => {
                const $el = $(el);
                const title = $el.find('.title, .film-title, .film-name').first().text().trim();
                const desc = $el.find('.desc, .description, .film-description').first().text().trim();
                const href = $el.find('.watch-btn, a').attr('href') || '';
                const id = href?.includes('/watch/')
                    ? href.split('/watch/')[1]?.split('?')[0]
                    : href.split('?')[0]?.split('/').filter(Boolean).pop() || '';

                const style = $el.attr('style') || $el.find('.bg-img, .film-poster-img').attr('style') || '';
                let image = '';
                if (style.includes('url(')) {
                    image = style.split('url(')[1].split(')')[0].replace(/['"]/g, '');
                }
                if (!image) {
                    const $img = $el.find('img').first();
                    image = $img.attr('data-src') || $img.attr('src') || '';
                }

                const aniListId = $el.find('.user-bookmark, .btn-fav').attr('data-alid') || $el.attr('data-id');

                if (id && title) {
                    slides.push({
                        id,
                        title,
                        image: sanitizeUrl(image) || `https://img.anikai.to/i/cache/images/${id}.jpg`,
                        provider: this.name,
                        extra: {
                            description: desc || 'No description available.',
                            aniListId: aniListId ? parseInt(aniListId) : undefined,
                        }
                    } as any);
                }
            });

            const latest: AnimeSearchResult[] = [];
            $('#latest-updates .tab-body .aitem, .film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster, .film-poster').first();

                const href = $poster.attr('href') || $el.find('a').first().attr('href') || '';
                let id = href?.includes('/watch/')
                    ? href.split('/watch/')[1]?.split('?')[0]
                    : href.split('?')[0]?.split('/').filter(Boolean).pop() || '';
                if (id.includes('#')) id = id.split('#')[0];

                const title = $el.find('.title, .film-name').first().text().trim();
                const $img = $poster.find('img').first();
                const image = $img.attr('data-src') || $img.attr('src') || '';

                const sub = $el.find('.tick-sub').text().trim();
                const dub = $el.find('.tick-dub').text().trim();

                if (id && title) {
                    latest.push({
                        id,
                        title,
                        image: sanitizeUrl(image),
                        provider: this.name,
                        subOrDub: sub || dub ? `${sub}${dub ? ` / ${dub}` : ''}` : undefined
                    });
                }
            });

            const trending = await this.getTrending(1);

            return { slides, trending, latest, completed: [], upcoming: [] };
        } catch (error: any) {
            console.error('[Anikai] getHome failed, falling back to HiAnime...', error.message);
            try {
                const hianime = new HiAnimeProvider();
                const trendingRes = await hianime.getTrending();
                const fallbackSlides = trendingRes.slice(0, 10).map((item: AnimeSearchResult) => ({
                    ...item,
                    extra: {
                        description: 'Trending anime',
                        aniListId: undefined
                    }
                })) as any[];
                return { slides: fallbackSlides, trending: trendingRes, latest: trendingRes, completed: [], upcoming: [] };
            } catch (fallbackError) {
                console.error('[Anikai] Fallback failed:', fallbackError);
                return { slides: [], trending: [], latest: [], completed: [], upcoming: [] };
            }
        }
    }
}
