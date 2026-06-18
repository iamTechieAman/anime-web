import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

// aniwaves.ru is the current live mirror of the original Aniwave (9anime successor)
const BASE_URL = 'https://aniwaves.ru';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': BASE_URL,
    'Origin': BASE_URL,
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};

function parseAnimeCards($: ReturnType<typeof cheerio.load>, selector: string): AnimeSearchResult[] {
    const results: AnimeSearchResult[] = [];
    $(selector).each((_, el) => {
        const $el = $(el);
        // aniwaves.ru uses flw-item structure (same as 9anime/Zoro)
        const $link = $el.find('.film-poster, .poster');
        const href = $link.attr('href') || $el.find('a').first().attr('href') || '';
        // ID is the slug after /watch/ or the last URL segment
        const id = href.includes('/watch/')
            ? href.split('/watch/')[1]?.split('?')[0]
            : href.split('/').filter(Boolean).pop() || '';

        const title = $el.find('.film-name a, .film-name, .dynamic-name').first().text().trim()
            || $el.find('a').first().attr('title') || '';

        // Images use data-src (lazy-loaded)
        const $img = $el.find('img');
        const image = $img.attr('data-src') || $img.attr('src') || '';

        // Sub/Dub counts
        const subCount = $el.find('.tick-sub, .sub').text().trim();
        const dubCount = $el.find('.tick-dub, .dub').text().trim();

        if (id && title) {
            results.push({
                id,
                title,
                image,
                provider: 'aniwave',
                subOrDub: dubCount ? 'both' : 'sub',
            });
        }
    });
    return results;
}

export class AniwaveProvider implements AnimeProvider {
    name = 'aniwave';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/filter`, {
                params: { keyword: query },
                headers: HEADERS,
                timeout: 10000,
            });
            const $ = cheerio.load(response.data);
            // aniwaves.ru uses .film_list-wrap .flw-item structure
            return parseAnimeCards($, '.film_list-wrap .flw-item, .aitem');
        } catch (error) {
            console.error('[Aniwave] Search failed:', error);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            // /updated shows recently updated anime
            const url = page > 1 ? `${BASE_URL}/updated?page=${page}` : `${BASE_URL}/updated`;
            const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
            const $ = cheerio.load(response.data);
            const results = parseAnimeCards($, '.film_list-wrap .flw-item, .aitem');
            if (results.length > 0) return results;
            // fallback: try newest
            return await this.getNewest(page);
        } catch (e) {
            console.error('[Aniwave] getRecent failed:', e);
            return [];
        }
    }

    async getNewest(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = page > 1 ? `${BASE_URL}/newest?page=${page}` : `${BASE_URL}/newest`;
            const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
            const $ = cheerio.load(response.data);
            return parseAnimeCards($, '.film_list-wrap .flw-item, .aitem');
        } catch (e) {
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = page > 1 ? `${BASE_URL}/trending?page=${page}` : `${BASE_URL}/trending`;
            const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
            const $ = cheerio.load(response.data);
            const results = parseAnimeCards($, '.film_list-wrap .flw-item, .aitem');
            if (results.length > 0) return results;
            return await this.getRecent(page);
        } catch (e) {
            console.error('[Aniwave] getTrending failed:', e);
            return [];
        }
    }

    async getPopular(page: number = 1): Promise<AnimeSearchResult[]> {
        return this.getTrending(page);
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            // Try /watch/{id} first, then /anime/{id}
            let url = id.includes('/') ? `${BASE_URL}/${id}` : `${BASE_URL}/watch/${id}`;
            const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
            const $ = cheerio.load(response.data);

            const title = $('.film-name, h1.film-name, .dynamic-name').first().text().trim();
            const image = $('.film-poster img, .detail-infor-content img').attr('data-src')
                || $('.film-poster img').attr('src') || '';
            const description = $('.film-description, .description').first().text().trim();

            const episodes: any[] = [];
            // Episode list on aniwaves.ru uses .ep-item or server/ep buttons
            $('.ep-item, .server-item a, a[href*="ep="]').each((_, el) => {
                const $ep = $(el);
                const href = $ep.attr('href') || '';
                const epNum = parseInt($ep.attr('data-number') || $ep.text().trim() || '0');
                const epId = href.split('?')[0].split('/').filter(Boolean).pop() || href;
                if (epId) {
                    episodes.push({ id: epId, number: epNum, title: `Episode ${epNum}` });
                }
            });

            return { id, title, image, description, episodes };
        } catch (error) {
            console.error('[Aniwave] GetInfo failed:', error);
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
            // Construct episode watch URL
            let episodeUrl: string;
            if (episodeId.startsWith('http')) {
                episodeUrl = episodeId;
            } else if (episodeId.includes(id)) {
                episodeUrl = `${BASE_URL}/watch/${episodeId}`;
            } else {
                episodeUrl = `${BASE_URL}/watch/${id}?ep=${episodeId}`;
            }

            return [{
                url: episodeUrl,
                isM3U8: false,
                quality: 'auto',
                isIframe: true,
                server: 'Aniwave',
                headers: {
                    Referer: BASE_URL,
                    Origin: BASE_URL,
                }
            }];
        } catch (error) {
            console.error('[Aniwave] getSources failed:', error);
            return [];
        }
    }
}
