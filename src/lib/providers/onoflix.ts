import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

const BASE_URL = 'https://onoflix.live';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export class OnoflixProvider implements AnimeProvider {
    name = 'onoflix';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            // Use /en/search as discovered in browser analysis
            const response = await axios.get(`${BASE_URL}/en/search`, {
                params: { q: query },
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            // Based on Onoflix.live structure
            $('a[href*="/movie/"], a[href*="/series/"]').each((_, element) => {
                const $el = $(element);
                const href = $el.attr('href') || '';
                const title = $el.find('h3, .title, span.truncate').first().text().trim();
                const image = $el.find('img').attr('src');

                if (href && title) {
                    const id = href.split('/').pop() || '';
                    const type = href.includes('/movie/') ? 'movie' : 'tv';
                    results.push({
                        id: `${type}|${id}`, // Store type in ID for info/sources routing
                        title,
                        image: image?.startsWith('http') ? image : `${BASE_URL}${image}`,
                        provider: 'onoflix'
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[Onoflix] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const [type, realId] = id.includes('|') ? id.split('|') : ['movie', id];
            const url = `${BASE_URL}/${type === 'movie' ? 'movie' : 'series'}/${realId}`;
            
            const response = await axios.get(url, {
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const title = $('h1').first().text().trim() || 'Unknown Title';
            const image = $('img[alt="Poster"]').attr('src');
            const description = $('.description, .plot').text().trim();

            const episodes: any[] = [];
            if (type === 'tv') {
                // Handle series episodes - Onoflix typically has season/episode selectors
                // This might need more specific selectors from browser analysis
                $('.episode-item, .ep-item').each((i, el) => {
                    episodes.push({
                        id: $(el).attr('data-id') || `${i+1}`,
                        number: i + 1,
                        title: $(el).text().trim()
                    });
                });
            } else {
                episodes.push({ id: realId, number: 1, title: 'Full Movie' });
            }

            return {
                id,
                title,
                image: image?.startsWith('http') ? image : `${BASE_URL}${image}`,
                description,
                episodes,
                totalEpisodes: episodes.length
            };
        } catch (error) {
            console.error('[Onoflix] GetInfo failed:', error);
            throw error;
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            const [type] = id.includes('|') ? id.split('|') : ['movie', id];
            // Onoflix uses embeds. They often have multiple servers.
            // We'll return an iframe source for now as fallback.
            const url = `${BASE_URL}/embed/${type === 'movie' ? 'movie' : 'tv'}/${episodeId}`;
            
            return [{
                url: url,
                isM3U8: false,
                isIframe: true,
                quality: 'auto'
            }];
        } catch (error) {
            console.error('[Onoflix] GetSources failed:', error);
            return [];
        }
    }

    async getTVSeries(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = `${BASE_URL}/series?page=${page}`;
            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('a[href*="/series/"]').each((_, element) => {
                const $el = $(element);
                const href = $el.attr('href') || '';
                const title = $el.find('h3, .title, span').first().text().trim();
                const image = $el.find('img').attr('src');

                if (href && title) {
                    const id = href.split('/').pop() || '';
                    results.push({
                        id: `tv|${id}`,
                        title,
                        image: image?.startsWith('http') ? image : `${BASE_URL}${image}`,
                        provider: 'onoflix'
                    });
                }
            });
            return results;
        } catch (error) {
            console.error('[Onoflix] getTVSeries failed:', error);
            return [];
        }
    }
}
