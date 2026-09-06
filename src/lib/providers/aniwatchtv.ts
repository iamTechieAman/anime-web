import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { ParserError, safeString, safeInt, safeArray, isValidUrl, sanitizeUrl } from './parser-utils';

// aniwatchtv.com.ro - WordPress-based anime site with Sub & Dub content
// Uses the "animestream-4" WordPress theme
const BASE_URL = 'https://aniwatchtv.com.ro';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': BASE_URL,
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
        let isAnimeUrl = href.includes('/anime/');
        if (isAnimeUrl) {
            id = href.replace(BASE_URL, '').replace('/anime/', '').replace(/\/$/, '');
        } else {
            // Episode URL: strip "-episode-N" suffix
            const slug = href.split('/').filter(Boolean).pop() || '';
            id = slug.replace(/-episode-\d+[^/]*$/, '');
        }

        // Title: the direct text node (not the h2 episode title)
        const $tt = $el.find('.tt');
        const title = $tt.clone().find('h2').remove().end().text().trim()
            || $link.attr('title')?.replace(/Episode \d+.*$/, '').trim()
            || '';

        // Image: data-src (lazy-loaded) or src
        const $img = $el.find('img');
        const image = $img.attr('data-src') || $img.attr('src') || '';

        // Sub/Dub info
        const subDubBadge = $el.find('.sb').text().trim().toLowerCase();
        const subOrDub = subDubBadge === 'dub' ? 'dub' : 'sub';

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

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/`, {
                params: { s: query },
                headers: HEADERS,
                timeout: 12000,
            });
            if (!response.data || typeof response.data !== 'string') return [];
            const $ = cheerio.load(response.data);
            return parseCards($, 'article.bs, .listupd article.bs');
        } catch (error) {
            console.error('[AniwatchTV] Search failed:', error);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`;
            const response = await axios.get(url, { headers: HEADERS, timeout: 12000 });
            if (!response.data || typeof response.data !== 'string') return [];
            const $ = cheerio.load(response.data);
            let results = parseCards($, '.releases.latesthome article.bs, .listupd article.bs');
            if (results.length === 0) {
                results = parseCards($, 'article.bs');
            }
            return results.slice(0, 24);
        } catch (e) {
            console.error('[AniwatchTV] getRecent failed:', e);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/`, { headers: HEADERS, timeout: 12000 });
            if (!response.data || typeof response.data !== 'string') return [];
            const $ = cheerio.load(response.data);
            let results = parseCards($, '.bixbox.bbnofrm article.bs, .releases.hothome ~ .listupd article.bs');
            if (results.length === 0) {
                results = parseCards($, 'article.bs');
            }
            return results.slice(0, 20);
        } catch (e) {
            console.error('[AniwatchTV] getTrending failed:', e);
            return this.getRecent(page);
        }
    }

    async getPopular(page: number = 1): Promise<AnimeSearchResult[]> {
        return this.getTrending(page);
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const url = id.startsWith('http') ? id : `${BASE_URL}/anime/${id}/`;
            const response = await axios.get(url, { headers: HEADERS, timeout: 12000 });
            if (!response.data || typeof response.data !== 'string') {
                throw new ParserError(this.name, 'getInfo', id, 'Received empty HTML response');
            }
            const $ = cheerio.load(response.data);

            const title = $('.entry-title, h1.entry-title, .bigcontent .infox h1').first().text().trim()
                || $('h1').first().text().trim();
            const image = $('.bigcontent .imgdesc img, .thumb img').attr('data-src')
                || $('.bigcontent img').attr('src') || '';
            const description = $('.entry-content p, .synp, .bigcontent .infox .synopsis').first().text().trim();

            // Episode list
            const episodes: any[] = [];
            $('.eplister li, .eplist a, .naveps a, .epl-num').each((_, el) => {
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
        } catch (error) {
            console.error('[AniwatchTV] GetInfo failed:', error);
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
        try {
            const episodeUrl = episodeId.startsWith('http')
                ? episodeId
                : `${BASE_URL}/${id}-episode-${episodeId}/`;

            const response = await axios.get(episodeUrl, { headers: HEADERS, timeout: 12000 });
            if (!response.data || typeof response.data !== 'string') {
                return [{
                    url: episodeUrl,
                    isM3U8: false,
                    quality: 'auto',
                    isIframe: true,
                    server: 'AniwatchTV',
                    headers: { Referer: BASE_URL }
                }];
            }
            const $ = cheerio.load(response.data);

            const sources: VideoSource[] = [];

            $('.ps__-list .server-item .btn, .serverlist .server a, .player-server a').each((_, el) => {
                const $el = $(el);
                const src = $el.attr('data-src') || $el.attr('data-video') || $el.attr('href') || '';
                const serverName = $el.text().trim() || $el.attr('data-name') || 'Server';
                if (isValidUrl(src)) {
                    sources.push({
                        url: sanitizeUrl(src),
                        isM3U8: src.includes('.m3u8'),
                        quality: 'auto',
                        isIframe: true,
                        server: serverName,
                        headers: { Referer: BASE_URL }
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
                    headers: { Referer: BASE_URL }
                });
            }

            return sources;
        } catch (error) {
            console.error('[AniwatchTV] getSources failed:', error);
            return [];
        }
    }
}
