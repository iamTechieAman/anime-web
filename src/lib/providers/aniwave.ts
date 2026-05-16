import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

const BASE_URL = 'https://aniwave.com.pl';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class AniwaveProvider implements AnimeProvider {
    name = 'aniwave';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/search`, {
                params: { keyword: query },
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('.film-name a').each((_, element) => {
                const $el = $(element);
                const href = $el.attr('href');
                const id = href?.split('/').filter(Boolean).pop() || '';
                const title = $el.text().trim();
                
                // For images, we might need to look at the parent film-poster or similar
                const $poster = $el.closest('.flw-item').find('.film-poster img');
                const image = $poster.attr('data-src') || $poster.attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[Aniwave] Search failed:', error);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = page > 1 ? `${BASE_URL}/page/${page}/` : BASE_URL;
            const response = await axios.get(url, {
                headers: { 'User-Agent': USER_AGENT }
            });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            // Updated selectors for aniwave.com.pl
            $('.film-name a').each((_, element) => {
                const $el = $(element);
                const href = $el.attr('href');
                // The URL is like https://aniwave.com.pl/anime/one-piece/
                const id = href?.split('/').filter(Boolean).pop() || '';
                const title = $el.text().trim();
                
                const $poster = $el.closest('.flw-item').find('.film-poster img');
                const image = $poster.attr('data-src') || $poster.attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });
            return results;
        } catch (e) {
            console.error('[Aniwave] getRecent failed:', e);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(BASE_URL, {
                headers: { 'User-Agent': USER_AGENT }
            });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            // Popular Today section
            $('h2:contains("Popular Today")').nextAll('.flw-item').each((_, element) => {
                const $el = $(element);
                const $link = $el.find('.film-name a');
                const href = $link.attr('href');
                const id = href?.split('/').filter(Boolean).pop() || '';
                const title = $link.text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            if (results.length === 0) {
                 return this.getRecent(page);
            }

            return results;
        } catch (e) {
            return this.getRecent(page);
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const response = await axios.get(`${BASE_URL}/anime/${id}/`, {
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const title = $('.film-name').first().text().trim();
            const image = $('.film-poster img').first().attr('src') || $('.film-poster img').first().attr('data-src');
            const description = $('.film-description').first().text().trim() || $('.description').first().text().trim();

            const episodes: any[] = [];
            // aniwave.com.pl seems to list episodes in a grid or list
            $('.ep-item').each((_, el) => {
                const $ep = $(el);
                const href = $ep.attr('href');
                const epId = href?.split('/').filter(Boolean).pop() || '';
                const number = parseInt($ep.attr('data-number') || $ep.text().match(/\d+/)?.[0] || '0');
                const epTitle = $ep.attr('title') || `Episode ${number}`;

                if (epId && number) {
                    episodes.push({ id: epId, number, title: epTitle });
                }
            });

            return { id, title, image, description, episodes };
        } catch (error) {
            console.error('[Aniwave] GetInfo failed:', error);
            throw error;
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            // For now, return a placeholder iframe if we can't find direct sources
            // aniwave.com.pl usually has embeds on the episode page
            return [{
                url: `${BASE_URL}/${episodeId}/`, // Direct link to episode page as iframe
                isM3U8: false,
                quality: 'auto',
                isIframe: true,
                server: 'Aniwave'
            }];
        } catch (error) {
            return [];
        }
    }
}

