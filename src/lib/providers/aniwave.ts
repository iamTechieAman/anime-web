import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { ParserError, safeString, safeInt, safeArray, isValidUrl, sanitizeUrl } from './parser-utils';

export const ANIWAVE_MIRRORS = [
    'https://aniwaves.ru',
    'https://aniwave.to',
    'https://aniwave.se',
    'https://lite.aniwave.to',
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};

function parseAnimeCards($: ReturnType<typeof cheerio.load>, selector: string): AnimeSearchResult[] {
    const results: AnimeSearchResult[] = [];
    $(selector).each((_, el) => {
        const $el = $(el);
        const $link = $el.find('.film-poster, .poster, .film-poster-ahref, a').first();
        const href = $link.attr('href') || $el.find('a').first().attr('href') || '';

        const id = href.includes('/watch/')
            ? href.split('/watch/')[1]?.split('?')[0]
            : href.split('?')[0]?.split('/').filter(Boolean).pop() || '';

        const title = $el.find('.film-name a, .film-name, .dynamic-name, .title').first().text().trim()
            || $link.attr('title') || '';

        const $img = $el.find('img').first();
        const image = $img.attr('data-src') || $img.attr('src') || '';

        const dubCount = $el.find('.tick-dub, .dub').text().trim();
        const subCount = $el.find('.tick-sub, .sub').text().trim();

        if (id && title) {
            results.push({
                id,
                title,
                image: sanitizeUrl(image),
                provider: 'aniwave',
                subOrDub: (subCount && dubCount) ? 'both' : (dubCount ? 'dub' : 'sub'),
            });
        }
    });
    return results;
}

export class AniwaveProvider implements AnimeProvider {
    name = 'aniwave';

    /**
     * Executes requests with dynamic mirror auto-switching and strict 10-second timeout.
     */
    private async fetchFromMirrors(path: string, options: AxiosRequestConfig = {}): Promise<{ data: any; mirror: string }> {
        const errors: string[] = [];
        for (const mirror of ANIWAVE_MIRRORS) {
            const url = path.startsWith('http') ? path : `${mirror}${path.startsWith('/') ? path : `/${path}`}`;
            try {
                const response = await axios({
                    url,
                    timeout: 10000,
                    ...options,
                    headers: {
                        ...HEADERS,
                        'Referer': `${mirror}/`,
                        'Origin': mirror,
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
        throw new Error(`[Aniwave] All mirrors failed for path "${path}": ${errors.join(' | ')}`);
    }

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const cleanQuery = query.trim();
            if (!cleanQuery) return [];

            const { data } = await this.fetchFromMirrors(`/filter?keyword=${encodeURIComponent(cleanQuery)}`);
            if (!data || typeof data !== 'string') return [];
            const $ = cheerio.load(data);
            return parseAnimeCards($, '.film_list-wrap .flw-item, .film_list-wrap .item, .aitem, .item');
        } catch (error: any) {
            console.error('[Aniwave] Search failed:', error.message);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const path = page > 1 ? `/updated?page=${page}` : '/updated';
            const { data } = await this.fetchFromMirrors(path);
            if (!data || typeof data !== 'string') return [];
            const $ = cheerio.load(data);
            const results = parseAnimeCards($, '.film_list-wrap .flw-item, .film_list-wrap .item, .aitem');
            if (results.length > 0) return results;
            return await this.getNewest(page);
        } catch (e: any) {
            console.error('[Aniwave] getRecent failed:', e.message);
            return [];
        }
    }

    async getNewest(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const path = page > 1 ? `/newest?page=${page}` : '/newest';
            const { data } = await this.fetchFromMirrors(path);
            if (!data || typeof data !== 'string') return [];
            const $ = cheerio.load(data);
            return parseAnimeCards($, '.film_list-wrap .flw-item, .film_list-wrap .item, .aitem');
        } catch (e: any) {
            console.error('[Aniwave] getNewest failed:', e.message);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const path = page > 1 ? `/trending?page=${page}` : '/trending';
            const { data } = await this.fetchFromMirrors(path);
            if (!data || typeof data !== 'string') return [];
            const $ = cheerio.load(data);
            const results = parseAnimeCards($, '.film_list-wrap .flw-item, .film_list-wrap .item, .aitem');
            if (results.length > 0) return results;
            return await this.getRecent(page);
        } catch (e: any) {
            console.error('[Aniwave] getTrending failed:', e.message);
            return [];
        }
    }

    async getPopular(page: number = 1): Promise<AnimeSearchResult[]> {
        return this.getTrending(page);
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const cleanId = id.replace(/^\//, '').split('?')[0];
            const path = cleanId.includes('/') ? `/${cleanId}` : `/watch/${cleanId}`;
            const { data } = await this.fetchFromMirrors(path);

            if (!data || typeof data !== 'string') {
                throw new ParserError(this.name, 'getInfo', id, 'Received empty HTML response');
            }
            const $ = cheerio.load(data);

            const title = $('.film-name, h1.film-name, .anime-name, .dynamic-name, h1').first().text().trim();
            const $img = $('.film-poster img, .detail-infor-content img, .poster img').first();
            const image = $img.attr('data-src') || $img.attr('src') || '';
            const description = $('.film-description, .description, .detail-infor-content .shorting').first().text().trim();

            const episodes: any[] = [];
            $('.ep-item, .server-item a, a[href*="ep="], .episodes-list a, .range-item a').each((_, el) => {
                const $ep = $(el);
                const href = $ep.attr('href') || '';
                const epNum = safeInt($ep.attr('data-number') || $ep.text().replace(/[^\d]/g, ''), 0);
                const epId = $ep.attr('data-id') || href.split('?')[0].split('/').filter(Boolean).pop() || href;
                if (epId && epNum > 0) {
                    episodes.push({ id: epId, number: epNum, title: `Episode ${epNum}` });
                }
            });

            return {
                id,
                title: title || id,
                image: sanitizeUrl(image),
                description,
                episodes,
                totalEpisodes: episodes.length,
            };
        } catch (error: any) {
            console.error('[Aniwave] GetInfo failed:', error.message);
            throw error;
        }
    }

    async getServers(episodeId: string): Promise<any[]> {
        return [
            { serverName: 'Aniwave Sub', serverId: 'aniwave_sub', type: 'sub' },
            { serverName: 'Aniwave Dub', serverId: 'aniwave_dub', type: 'dub' }
        ];
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            const primaryMirror = ANIWAVE_MIRRORS[0];
            let episodeUrl: string;
            if (episodeId.startsWith('http')) {
                episodeUrl = episodeId;
            } else if (episodeId.includes(id)) {
                episodeUrl = `${primaryMirror}/watch/${episodeId}`;
            } else {
                episodeUrl = `${primaryMirror}/watch/${id}?ep=${episodeId}`;
            }

            return [{
                url: episodeUrl,
                isM3U8: false,
                quality: 'auto',
                isIframe: true,
                server: 'Aniwave',
                headers: {
                    Referer: `${primaryMirror}/`,
                    Origin: primaryMirror,
                }
            }];
        } catch (error: any) {
            console.error('[Aniwave] getSources failed:', error.message);
            return [];
        }
    }
}
