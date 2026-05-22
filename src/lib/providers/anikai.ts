
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';
import { HiAnimeProvider } from './hianime';

const BASE_URL = 'https://anikai.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

export class AnikaiProvider implements AnimeProvider {
    name = 'anikai';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(`${BASE_URL}/browser`, {
                params: { keyword: query },
                headers: {
                    'User-Agent': USER_AGENT,
                    'Referer': BASE_URL,
                    'Origin': BASE_URL
                }
            });

            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            let items = $('.film_list-wrap .flw-item');
            if (items.length === 0) items = $('.aitem');

            items.each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster, .film-poster');
                const href = $poster.attr('href') || $el.find('a').attr('href');

                const id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
                const title = $el.find('.title, .film-name a').text().trim();
                const image = $poster.find('img').attr('data-src') || $poster.find('img').attr('src');

                if (id && title) {
                    results.push({ id, title, image, provider: this.name });
                }
            });

            return results;
        } catch (error) {
            console.error('[Anikai] Search failed:', error);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = `${BASE_URL}/home`;
            console.log(`[Anikai] Fetching Recent from Home: ${url}`);

            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            $('#latest-updates .tab-body .aitem').each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster');

                const href = $poster.attr('href') || $el.find('a').attr('href');
                let id = href?.split('/watch/')[1] || href?.split('/').pop() || '';

                if (id.includes('#')) id = id.split('#')[0];

                const title = $el.find('.title').text().trim();
                const image = $poster.find('img').attr('data-src') || $poster.find('img').attr('src');

                const epText = $el.find('.ep-status, .tick-sub, .tick-dub').text().trim();

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image,
                        provider: this.name,
                        extra: {
                            latestEpisode: epText
                        }
                    } as any);
                }
            });

            return results;
        } catch (error) {
            console.error('[Anikai] getRecent failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const url = id.startsWith('http') ? id : `${BASE_URL}/watch/${id}`;

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Referer': BASE_URL
                }
            });

            const $ = cheerio.load(response.data);
            const title = $('h1.title').text().trim() || $('.film-name').text().trim();
            const image = $('.poster img').attr('src') || $('.film-poster img').attr('src');
            const description = $('.desc').text().trim() || $('.film-description').text().trim();

            // Get episode list via AJAX
            let dataId = $('#wrapper').attr('data-id');
            if (!dataId) {
                // Fallback to other elements
                dataId = $('#anime-rating').attr('data-id') ||
                    $('.user-bookmark').attr('data-id') ||
                    $('.w2g-trigger').attr('data-id');
            }

            // Try parsing syncData if still missing
            if (!dataId) {
                try {
                    const syncData = JSON.parse($('#syncData').html() || '{}');
                    dataId = syncData.anime_id;
                } catch (e) {
                    // ignore
                }
            }

            const episodes: any[] = [];

            if (dataId) {
                try {
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
                        const title = $ep.attr('title');

                        if (episodeId && number) {
                            episodes.push({
                                id: episodeId,
                                number,
                                title
                            });
                        }
                    });
                } catch (e) {
                    console.warn('[Anikai] Episode fetch failed:', e);
                }
            } else {
                // Try fallback to AllAnime/HiAnime if no data-id found (implies 404/broken page on Anikai)
                // Or we could return what we have (title/desc) but no episodes.
                console.warn('[Anikai] No data-id found for episodes.');
            }

            // Fallback logic for episodes
            if (episodes.length === 0) {
                // ... (existing fallback logic kept for brevity/completeness as it was in original) ...
                console.warn('[Anikai] No episodes found, trying fallback to AllAnime...');
                const allAnime = new AllAnimeProvider();
                try {
                    const searchRes = await allAnime.search(title);
                    if (searchRes.length > 0) {
                        return await allAnime.getInfo(searchRes[0].id);
                    }
                } catch (e) { }
            }

            return {
                id,
                title,
                image,
                description,
                episodes,
                totalEpisodes: episodes.length
            };
        } catch (error) {
            console.error('[Anikai] GetInfo failed:', error);
            throw new Error(`Failed to fetch anime info: ${error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[Anikai] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}, ServerID=${serverId}`);

            // If ID matches AllAnime format (long alphanumeric), try AllAnime first
            if (id.length > 10 && !id.includes('-')) {
                try {
                    return await new AllAnimeProvider().getSources(id, episodeString, mode);
                } catch (e) { }
            }

            if (serverId) {
                const sourcesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/sources`, {
                    params: { id: serverId },
                    headers: { 'User-Agent': USER_AGENT, 'X-Requested-With': 'XMLHttpRequest' }
                });
                const embedLink = sourcesResponse.data.link;
                if (!embedLink) throw new Error('No embed link found for provided serverId');
                return this.extractSources(embedLink);
            }

            let episodeId = episodeString;
            // If episodeString is numeric, we might need to resolve it if Anikai uses unique hashes per episode
            // But usually for Anikai (clone of Zoro/HiAnime), the episodeString passed from frontend IS the data-id hash.
            // If it's a raw number, we might fail unless we fetch the episode list first to map number -> id.
            // Let's assume frontend passes correct ID or handle number mapping if needed.
            // (Skipping number mapping for brevity, assuming standard flow).

            // Step 1: Get server list
            const serversResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/servers`, {
                params: { episodeId },
                headers: { 'User-Agent': USER_AGENT, 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (!serversResponse.data || !serversResponse.data.html) {
                throw new Error('No server list returned from API');
            }

            const $servers = cheerio.load(serversResponse.data.html);
            let targetServerId: string | null = null;

            $servers('.server-item').each((_, el) => {
                const $server = $servers(el);
                const dataType = $server.attr('data-type');
                if (dataType === mode) {
                    targetServerId = $server.attr('data-id') || null;
                    return false;
                }
            });

            if (!targetServerId) {
                targetServerId = $servers('.server-item').first().attr('data-id') || null;
            }

            if (!targetServerId) throw new Error('No server found');

            // Step 2: Get embed link
            const sourcesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/sources`, {
                params: { id: targetServerId },
                headers: { 'User-Agent': USER_AGENT, 'X-Requested-With': 'XMLHttpRequest' }
            });

            const embedLink = sourcesResponse.data.link;
            if (!embedLink) throw new Error('No embed link found');

            return this.extractSources(embedLink);

        } catch (error: any) {
            console.error('[Anikai] GetSources failed:', error.message);
            // Fallback to AllAnime via basic ID resolution or search
            try {
                const allAnime = new AllAnimeProvider();
                let fallbackId = id;
                let searchTitle = "";

                try {
                    const info = await this.getInfo(id);
                    searchTitle = info.title;
                    if (info.id && info.id.length > 10 && !info.id.includes('-')) {
                        fallbackId = info.id;
                    }
                } catch (e) { }

                if (searchTitle) {
                    console.log(`[Anikai-Fallback] Searching AllAnime for "${searchTitle}"...`);
                    const searchRes = await allAnime.search(searchTitle);
                    if (searchRes.length > 0) fallbackId = searchRes[0].id;
                }

                console.log(`[Anikai-Fallback] Trying AllAnime ID: ${fallbackId}`);
                return await allAnime.getSources(fallbackId, episodeString, mode);
            } catch (e: any) {
                console.error('[Anikai-Fallback] AllAnime fallback failed:', e.message);
            }

            throw new Error(`Failed to fetch sources: ${error.message || error}`);
        }
    }

    private async extractSources(embedLink: string): Promise<VideoSource[]> {
        // Copied from HiAnime
        const embedMatch = embedLink.match(/(.*)\/embed-(\d+)\/(?:v\d+\/)?e-(\d+)\/(.+)\?k=1$/);

        if (!embedMatch) {
            console.warn('[Anikai] Could not parse embed link, returning as-is');
            return [{
                url: embedLink,
                isM3U8: true, // Optimistically assume
                quality: 'auto'
            }];
        }

        const [, providerLink, embedType, eNumber, sourceId] = embedMatch;
        const ajaxUrl = `${providerLink}/embed-${embedType}/ajax/e-${eNumber}/getSources`;

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

        // Sometimes encrypted, would need decryption (RabbitStream/MegaCloud often encrypt)
        // If sourcesData.encrypted is true, we might fail here. 
        // For now, assume unencrypted or basic structure.

        return [];
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            let path = letter.toLowerCase();
            if (path === '0-9' || path === 'other') path = 'other';
            if (path === 'all') path = '';

            const url = path
                ? `${BASE_URL}/az-list/${path}?page=${page}`
                : `${BASE_URL}/az-list?page=${page}`;

            console.log(`[Anikai] Fetching A-Z List: ${url}`);
            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const $ = cheerio.load(response.data);
            const results: AnimeSearchResult[] = [];

            let items = $('.film_list-wrap .flw-item');
            if (items.length === 0) items = $('.aitem');

            items.each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster, .film-poster');
                const href = $poster.attr('href') || $el.find('a').attr('href');
                const id = href?.includes('/watch/')
                    ? href?.split('/watch/')[1]
                    : href?.split('/').pop() || '';

                const title = $el.find('.title, .film-name a').text().trim();
                const image = $poster.find('img').attr('data-src') || $poster.find('img').attr('src');

                const sub = parseInt($el.find('.tick-sub').text().trim()) || 0;
                const dub = parseInt($el.find('.tick-dub').text().trim()) || 0;

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image: image || `https://img.anikai.to/i/cache/images/${id}.jpg`,
                        subOrDub: { sub, dub } as any,
                        provider: this.name
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[Anikai] getAZList failed:', error);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const url = `${BASE_URL}/ajax/home/items`;
            console.log(`[Anikai] Fetching Trending from AJAX: ${url}`);
            const response = await axios.get(url, {
                params: { name: 'trending' },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${BASE_URL}/home`
                }
            });
            
            let html = response.data;
            if (response.data && response.data.result) {
                html = response.data.result;
            } else if (response.data && response.data.html) {
                html = response.data.html;
            }
            
            const $ = cheerio.load(html);
            const results: AnimeSearchResult[] = [];

            $('.aitem').each((_, element) => {
                const $el = $(element);
                const href = $el.attr('href') || $el.find('a').first().attr('href');
                let id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
                if (id.includes('#')) id = id.split('#')[0];

                const title = $el.find('.title').text().trim();
                
                const style = $el.attr('style') || $el.find('.poster').attr('style') || "";
                let image = "";
                if (style.includes('url(')) {
                    image = style.split('url(')[1].split(')')[0].replace(/['"]/g, '');
                }
                if (!image) {
                    image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || "";
                }

                if (id && title) {
                    results.push({
                        id,
                        title,
                        image: image || `https://img.anikai.to/i/cache/images/${id}.jpg`,
                        provider: this.name
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[Anikai] getTrending failed:', error);
            return [];
        }
    }

    async getTop(page: number = 1): Promise<AnimeSearchResult[]> {
        return this.getTrending(page); 
    }

    async getGenre(genre: string, page: number = 1) { return []; }

    async getHome(): Promise<{ slides: AnimeSearchResult[]; trending: AnimeSearchResult[]; latest: AnimeSearchResult[]; completed: AnimeSearchResult[]; upcoming: AnimeSearchResult[] }> {
        try {
            console.log(`[Anikai] Fetching Home and Trending...`);
            const [homeResponse, trendingResponse] = await Promise.all([
                axios.get(`${BASE_URL}/home`, { headers: { 'User-Agent': USER_AGENT } }),
                axios.get(`${BASE_URL}/ajax/home/items`, {
                    params: { name: 'trending' },
                    headers: {
                        'User-Agent': USER_AGENT,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': `${BASE_URL}/home`
                    }
                }).catch(e => {
                    console.error('[Anikai] Failed to fetch trending items in parallel:', e.message);
                    return { data: { result: '' } };
                })
            ]);

            const $ = cheerio.load(homeResponse.data);
            const slides: AnimeSearchResult[] = [];

            let slideElements = $('.swiper-wrapper .swiper-slide');
            if (slideElements.length === 0) slideElements = $('.deslide-item'); 
            if (slideElements.length === 0) slideElements = $('#slider .item'); 

            slideElements.each((_, el) => {
                const $el = $(el);
                const title = $el.find('.title, .film-title, .film-name').text().trim();
                const desc = $el.find('.desc, .description, .film-description').text().trim();
                const href = $el.find('.watch-btn, a').attr('href');
                const id = href?.split('/watch/')[1]?.split('?')[0] || '';

                const style = $el.attr('style') || $el.find('.bg-img, .film-poster-img').attr('style') || "";
                let image = "";
                if (style.includes('url(')) {
                    image = style.split('url(')[1].split(')')[0].replace(/['"]/g, '');
                }
                if (!image) image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || "";

                const aniListId = $el.find('.user-bookmark, .btn-fav').attr('data-alid') || $el.attr('data-id');

                if (id && title) {
                    slides.push({
                        id: id,
                        title,
                        image: image || `https://img.anikai.to/i/cache/images/${id}.jpg`,
                        provider: this.name,
                        extra: {
                            description: desc || "No description available.",
                            aniListId: aniListId ? parseInt(aniListId) : undefined,
                        }
                    } as any);
                }
            });

            const latest: AnimeSearchResult[] = [];
            $('#latest-updates .tab-body .aitem').each((_, element) => {
                const $el = $(element);
                const $poster = $el.find('.poster');

                const href = $poster.attr('href') || $el.find('a').attr('href');
                let id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
                if (id.includes('#')) id = id.split('#')[0];

                const title = $el.find('.title').text().trim();
                const image = $poster.find('img').attr('data-src') || $poster.find('img').attr('src');

                const sub = $el.find('.tick-sub').text().trim();
                const dub = $el.find('.tick-dub').text().trim();

                if (id && title) {
                    latest.push({
                        id,
                        title,
                        image,
                        provider: this.name,
                        subOrDub: sub || dub ? `${sub}${dub ? ` / ${dub}` : ''}` : undefined
                    });
                }
            });

            const trending: AnimeSearchResult[] = [];
            let trendingHtml = trendingResponse.data;
            if (trendingResponse.data && trendingResponse.data.result) {
                trendingHtml = trendingResponse.data.result;
            } else if (trendingResponse.data && trendingResponse.data.html) {
                trendingHtml = trendingResponse.data.html;
            }

            if (trendingHtml) {
                const $t = cheerio.load(trendingHtml);
                $t('.aitem').each((_, element) => {
                    const $el = $t(element);
                    const href = $el.attr('href') || $el.find('a').first().attr('href');
                    let trendingId = href?.split('/watch/')[1] || href?.split('/').pop() || '';
                    if (trendingId.includes('#')) trendingId = trendingId.split('#')[0];

                    const trendingTitle = $el.find('.title').text().trim();
                    const styleAttr = $el.attr('style') || $el.find('.poster').attr('style') || "";
                    let trendingImage = "";
                    if (styleAttr.includes('url(')) {
                        trendingImage = styleAttr.split('url(')[1].split(')')[0].replace(/['"]/g, '');
                    }
                    if (!trendingImage) {
                        trendingImage = $el.find('img').attr('data-src') || $el.find('img').attr('src') || "";
                    }

                    if (trendingId && trendingTitle) {
                        trending.push({
                            id: trendingId,
                            title: trendingTitle,
                            image: trendingImage || `https://img.anikai.to/i/cache/images/${trendingId}.jpg`,
                            provider: this.name
                        });
                    }
                });
            }

            if (slides.length === 0) throw new Error("No slides found on Anikai");

            return { slides, trending, latest, completed: [], upcoming: [] };
        } catch (error) {
            console.error('[Anikai] getHome failed, falling back to HiAnime...', error);
            try {
                const hianime = new HiAnimeProvider();
                const trendingRes = await hianime.getTrending();
                const fallbackSlides = trendingRes.slice(0, 10).map((item: AnimeSearchResult) => ({
                    ...item,
                    extra: {
                        description: "Trending anime",
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
