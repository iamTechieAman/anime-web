import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { ParserError, safeString, safeInt, safeArray, isValidUrl, sanitizeUrl } from './parser-utils';

export const ANIWATCHTV_MIRRORS = [
    'https://aniwatchtv.com.ro',
    'https://aniwatchtv.to',
    'https://aniwatch.to',
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache',
};

function parseCards($: ReturnType<typeof cheerio.load>, selector: string): AnimeSearchResult[] {
    const results: AnimeSearchResult[] = [];
    $(selector).each((_, el) => {
        const $el = $(el);
        const $link = $el.find('a').first();
        const href = $link.attr('href') || '';

        // Extract anime slug: /anime/naruto-shippuden/ -> naruto-shippuden
        // Episode URLs: /naruto-shippuden-episode-1/ -> naruto-shippuden
        let id = '';
        const isAnimeUrl = href.includes('/anime/') || href.includes('/series/');
        if (isAnimeUrl) {
            id = href.replace(/https?:\/\/[^/]+/, '').replace(/^\/(anime|series)\//, '').replace(/\/$/, '');
        } else {
            // Episode URL: strip "-episode-N" suffix
            const slug = href.split('/').filter(Boolean).pop() || '';
            id = slug.replace(/-episode-\d+[^/]*$/, '');
        }

        // Title
        const $tt = $el.find('.tt');
        const title = $tt.clone().find('h2, .typez, span').remove().end().text().trim()
            || $el.find('.tt h2, .entry-title, .title').first().text().trim()
            || $link.attr('title')?.replace(/Episode \d+.*$/, '').trim()
            || '';

        // Image: data-src (lazy-loaded) or src
        const $img = $el.find('img').first();
        const image = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('src') || '';

        // Sub/Dub info
        const subDubBadge = $el.find('.sb, .typez, .bt .epx').first().text().trim().toLowerCase();
        const subOrDub = subDubBadge.includes('dub') ? 'dub' : 'sub';

        if (id && title) {
            results.push({
                id,
                title,
                image: image.startsWith('data:') ? '' : sanitizeUrl(image),
                provider: 'aniwatchtv',
                subOrDub,
            });
        }
    });
    return results;
}

export class AniwatchTVProvider implements AnimeProvider {
    name = 'aniwatchtv';

    /**
     * Executes requests with dynamic mirror auto-switching and strict 10s timeout.
     */
    private async fetchFromMirrors(path: string, options: AxiosRequestConfig = {}): Promise<{ data: any; mirror: string }> {
        const errors: string[] = [];
        for (const mirror of ANIWATCHTV_MIRRORS) {
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
        throw new Error(`[AniwatchTV] All mirrors failed for path "${path}": ${errors.join(' | ')}`);
    }

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const cleanQuery = query.trim();
            if (!cleanQuery) return [];

            const { data } = await this.fetchFromMirrors(`/?s=${encodeURIComponent(cleanQuery)}`);
            if (!data || typeof data !== 'string') return [];
            const $ = cheerio.load(data);
            return parseCards($, 'article.bs, .listupd article.bs, .bsx');
        } catch (error: any) {
            console.error('[AniwatchTV] Search failed across all mirrors:', error.message);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const path = page > 1 ? `/page/${page}/` : '/';
            const { data } = await this.fetchFromMirrors(path);
            if (!data || typeof data !== 'string') return [];
            const $ = cheerio.load(data);
            let results = parseCards($, '.releases.latesthome article.bs, .listupd article.bs, article.bs');
            if (results.length === 0) {
                results = parseCards($, 'article.bs, .bsx');
            }
            return results.slice(0, 24);
        } catch (e: any) {
            console.error('[AniwatchTV] getRecent failed:', e.message);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const { data } = await this.fetchFromMirrors('/');
            if (!data || typeof data !== 'string') return [];
            const $ = cheerio.load(data);
            let results = parseCards($, '.bixbox.bbnofrm article.bs, .releases.hothome ~ .listupd article.bs, article.bs');
            if (results.length === 0) {
                results = parseCards($, 'article.bs, .bsx');
            }
            return results.slice(0, 20);
        } catch (e: any) {
            console.error('[AniwatchTV] getTrending failed:', e.message);
            return this.getRecent(page);
        }
    }

    async getPopular(page: number = 1): Promise<AnimeSearchResult[]> {
        return this.getTrending(page);
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const cleanId = id.replace(/^\//, '').split('?')[0];
            const path = cleanId.startsWith('http') ? cleanId : `/anime/${cleanId}/`;
            const { data } = await this.fetchFromMirrors(path);

            if (!data || typeof data !== 'string') {
                throw new ParserError(this.name, 'getInfo', id, 'Received empty HTML response');
            }
            const $ = cheerio.load(data);

            const title = $('.entry-title, h1.entry-title, .bigcontent .infox h1, h1').first().text().trim();
            const $img = $('.bigcontent .imgdesc img, .thumb img, .poster img').first();
            const image = $img.attr('data-src') || $img.attr('src') || '';
            const description = $('.entry-content p, .synp, .bigcontent .infox .synopsis, .desc').first().text().trim();

            // Episode list
            const episodes: any[] = [];
            $('.eplister li, .eplist a, .naveps a, .epl-num, ul.clstyle li').each((_, el) => {
                const $ep = $(el);
                const href = $ep.attr('href') || $ep.closest('a').attr('href') || '';
                const epText = $ep.find('.epl-num').text() || $ep.text();
                const epNum = safeInt(epText.replace(/[^\d]/g, ''), 0);
                const epTitle = $ep.find('.epl-title').text().trim() || `Episode ${epNum}`;
                const subDub = $ep.find('.epl-sub').text().trim().toLowerCase() || 'sub';
                if (href && epNum > 0) {
                    episodes.push({
                        id: href,
                        number: epNum,
                        title: epTitle,
                        subOrDub: subDub,
                    });
                }
            });

            return { id, title: title || id, image: sanitizeUrl(image), description, episodes: episodes.reverse() };
        } catch (error: any) {
            console.error('[AniwatchTV] GetInfo failed:', error.message);
            throw error;
        }
    }

    async getServers(episodeId: string): Promise<any[]> {
        return [
            { serverName: 'AniwatchTV Sub', serverId: 'aniwatchtv_sub', type: 'sub' },
            { serverName: 'AniwatchTV Dub', serverId: 'aniwatchtv_dub', type: 'dub' }
        ];
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        const primaryMirror = ANIWATCHTV_MIRRORS[0];
        try {
            const episodeUrl = episodeId.startsWith('http')
                ? episodeId
                : `${primaryMirror}/${id}-episode-${episodeId}/`;

            const { data } = await this.fetchFromMirrors(episodeUrl);
            if (!data || typeof data !== 'string') {
                return [{
                    url: episodeUrl,
                    isM3U8: false,
                    quality: 'auto',
                    isIframe: true,
                    server: 'AniwatchTV',
                    headers: { Referer: `${primaryMirror}/` }
                }];
            }
            const $ = cheerio.load(data);

            const sources: VideoSource[] = [];

            $('.ps__-list .server-item .btn, .serverlist .server a, .player-server a, .mobius select option').each((_, el) => {
                const $el = $(el);
                const src = $el.attr('data-src') || $el.attr('data-video') || $el.attr('value') || $el.attr('href') || '';
                const serverName = $el.text().trim() || $el.attr('data-name') || 'Server';
                if (isValidUrl(src)) {
                    sources.push({
                        url: sanitizeUrl(src),
                        isM3U8: src.includes('.m3u8'),
                        quality: 'auto',
                        isIframe: true,
                        server: serverName,
                        headers: { Referer: `${primaryMirror}/` }
                    });
                }
            });

            if (sources.length === 0) {
                sources.push({
                    url: episodeUrl,
                    isM3U8: false,
                    quality: 'auto',
                    isIframe: true,
                    server: 'AniwatchTV',
                    headers: { Referer: `${primaryMirror}/` }
                });
            }

            return sources;
        } catch (error: any) {
            console.error('[AniwatchTV] getSources failed:', error.message);
            const fallbackUrl = episodeId.startsWith('http') ? episodeId : `${primaryMirror}/${id}-episode-${episodeId}/`;
            return [{
                url: fallbackUrl,
                isM3U8: false,
                quality: 'auto',
                isIframe: true,
                server: 'AniwatchTV Fallback',
                headers: { Referer: `${primaryMirror}/` }
            }];
        }
    }
}
