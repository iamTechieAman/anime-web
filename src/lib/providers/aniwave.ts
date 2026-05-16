import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

const BASE_URL = 'https://aniwave.com.ro';
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

            $('.film_list-wrap .flw-item').each((_, element) => {
                const $el = $(element);
                const href = $el.find('.film-poster a').attr('href');
                const id = href?.split('?')[0]?.split('/').pop() || '';

                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src') || $el.find('.film-poster img').attr('src');

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

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const response = await axios.get(`${BASE_URL}/${id}`, {
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const title = $('.film-name').first().text().trim();
            const image = $('.film-poster img').first().attr('src') || $('.film-poster img').first().attr('data-src');
            const description = $('.film-description').first().text().trim();

            const dataId = $('#wrapper').attr('data-id') || $('body').attr('data-id');
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
                    const epTitle = $ep.attr('title') || `Episode ${number}`;

                    if (episodeId && number) {
                        episodes.push({
                            id: episodeId,
                            number,
                            title: epTitle
                        });
                    }
                });
            }

            return {
                id,
                title,
                image,
                description,
                episodes
            };
        } catch (error) {
            console.error('[Aniwave] GetInfo failed:', error);
            throw error;
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            // Aniwave usually uses similar embed structure to HiAnime
            const serversResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/servers?episodeId=${episodeId}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $servers = cheerio.load(serversResponse.data.html);
            const sources: VideoSource[] = [];

            $servers('.server-item').each((_, el) => {
                const $server = $(el);
                const serverId = $server.attr('data-id');
                const serverName = $server.text().trim().toLowerCase();
                const type = $server.attr('data-type'); // sub or dub

                if (type === mode) {
                    // In a real scraper we would fetch the embed URL via /ajax/v2/episode/sources?id={serverId}
                    // For now we add a placeholder that we know works or can be expanded
                    sources.push({
                        url: `${BASE_URL}/embed/${serverId}`, // This is a placeholder
                        isM3U8: false,
                        quality: 'auto',
                        isIframe: true,
                        server: serverName
                    });
                }
            });

            return sources;
        } catch (error) {
            console.error('[Aniwave] GetSources failed:', error);
            return [];
        }
    }
}
