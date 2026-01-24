import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

const BASE_URL = 'https://hianime.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

export class HiAnimeProvider implements AnimeProvider {
    name = 'hianime';

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
                const id = $el.find('.film-poster').attr('href')?.split('/')[1] || '';
                const title = $el.find('.film-name a').text().trim();
                const image = $el.find('.film-poster img').attr('data-src');

                if (id && title) {
                    results.push({ id, title, image });
                }
            });

            return results;
        } catch (error) {
            console.error('[HiAnime] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const response = await axios.get(`${BASE_URL}/${id}`, {
                headers: { 'User-Agent': USER_AGENT }
            });

            const $ = cheerio.load(response.data);
            const title = $('.film-name').text().trim();
            const image = $('.film-poster img').attr('src');
            const description = $('.film-description').text().trim();

            // Get episode list via AJAX
            const dataId = $('#wrapper').attr('data-id');
            const episodesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/list/${dataId}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $episodes = cheerio.load(episodesResponse.data.html);
            const episodes: any[] = [];

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

            return {
                id,
                title,
                image,
                description,
                episodes,
                totalEpisodes: episodes.length
            };
        } catch (error) {
            console.error('[HiAnime] GetInfo failed:', error);
            throw new Error(`Failed to fetch anime info: ${error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            console.log(`[HiAnime] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}`);

            // Step 0: If episodeString is not a valid HiAnime episode ID, we need to resolve it
            // HiAnime episode IDs are typically longer alphanumeric strings, not just "1", "2", etc.
            let episodeId = episodeString;

            // If it looks like just an episode number, fetch the show info to get the real episode ID
            if (/^\d+$/.test(episodeString)) {
                console.log(`[HiAnime] Episode string "${episodeString}" appears to be a number, resolving to HiAnime episode ID...`);
                const episodeNumber = parseInt(episodeString);

                // Fetch show details to get episode list
                const response = await axios.get(`${BASE_URL}/${id}`, {
                    headers: { 'User-Agent': USER_AGENT }
                });

                const $ = cheerio.load(response.data);
                const dataId = $('#wrapper').attr('data-id');

                if (!dataId) {
                    throw new Error('Could not find show data-id');
                }

                const episodesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/list/${dataId}`, {
                    headers: {
                        'User-Agent': USER_AGENT,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const $episodes = cheerio.load(episodesResponse.data.html);
                let foundEpisodeId: string | null = null;

                $episodes('.ep-item').each((_, el) => {
                    const $ep = $episodes(el);
                    const epId = $ep.attr('data-id');
                    const epNum = parseInt($ep.attr('data-number') || '0');

                    if (epNum === episodeNumber && epId) {
                        foundEpisodeId = epId;
                        return false; // break
                    }
                });

                if (!foundEpisodeId) {
                    throw new Error(`Episode ${episodeNumber} not found for show ${id}`);
                }

                episodeId = foundEpisodeId;
                console.log(`[HiAnime] Resolved episode ${episodeNumber} to HiAnime ID: ${episodeId}`);
            }

            // Step 1: Get server list for episode
            const serversResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/servers`, {
                params: { episodeId },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $servers = cheerio.load(serversResponse.data.html);
            let serverId: string | null = null;

            // Find server ID for requested type (sub/dub)
            $servers('.server-item').each((_, el) => {
                const $server = $servers(el);
                const dataType = $server.attr('data-type');
                if (dataType === mode) {
                    serverId = $server.attr('data-id') || null;
                    return false; // break
                }
            });

            if (!serverId) {
                // Fallback to raw if requested type not found
                $servers('.server-item').each((_, el) => {
                    const $server = $servers(el);
                    const dataType = $server.attr('data-type');
                    if (dataType === 'raw') {
                        serverId = $server.attr('data-id') || null;
                        return false;
                    }
                });
            }

            if (!serverId) {
                throw new Error('No server found for requested type');
            }

            // Step 2: Get embed link
            const sourcesResponse = await axios.get(`${BASE_URL}/ajax/v2/episode/sources`, {
                params: { id: serverId },
                headers: {
                    'User-Agent': USER_AGENT,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const embedLink = sourcesResponse.data.link;
            if (!embedLink) {
                throw new Error('No embed link found');
            }

            // Step 3: Extract actual video source from embed
            // The embed link follows pattern: domain/embed-X/e-Y/hash?k=1 or domain/embed-X/vY/e-Z/hash?k=1
            const embedMatch = embedLink.match(/(.*)\/embed-(\d+)\/(?:v\d+\/)?e-(\d+)\/(.+)\?k=1$/);

            if (!embedMatch) {
                console.warn('[HiAnime] Could not parse embed link, returning as-is');
                return [{
                    url: embedLink,
                    isM3U8: true,
                    quality: 'auto'
                }];
            }

            const [, providerLink, embedType, eNumber, sourceId] = embedMatch;

            const ajaxUrl = `${providerLink}/embed-${embedType}/ajax/e-${eNumber}/getSources`;
            console.log('[HiAnime] Embed URL:', embedLink);
            console.log('[HiAnime] Ajax URL:', ajaxUrl);
            console.log('[HiAnime] Source ID:', sourceId);

            // Step 4: Get final sources
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

            // Handle different response formats
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

            throw new Error('Unknown sources format');

        } catch (error: any) {
            console.error('[HiAnime] GetSources failed:', error);
            throw new Error(`Failed to fetch sources: ${error.message || error}`);
        }
    }
    async getTop(page: number = 1): Promise<AnimeSearchResult[]> {
        // Return static list of top anime to avoid Cloudflare scraping blocks and ensure fast load
        const topAnime: AnimeSearchResult[] = [
            {
                id: "one-piece-100",
                title: "One Piece",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/bcd84731a3eda4f4a306250769675065.jpg",
                subOrDub: { sub: 1155, dub: 1143, raw: 1155 } as any
            },
            {
                id: "naruto-shippuden-355",
                title: "Naruto: Shippuden",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/9cbcf87f54194742e7686119089478f8.jpg",
                subOrDub: { sub: 500, dub: 500, raw: 500 } as any
            },
            {
                id: "bleach-806",
                title: "Bleach",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/bd5ae1d387a59c5abcf5e1a6a616728c.jpg",
                subOrDub: { sub: 366, dub: 366, raw: 366 } as any
            },
            {
                id: "jujutsu-kaisen-2nd-season-18413",
                title: "Jujutsu Kaisen 2nd Season",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/b51f863b05f30576cf9d85fa9b911bb5.png",
                subOrDub: { sub: 23, dub: 23, raw: 23 } as any
            },
            {
                id: "black-clover-2404",
                title: "Black Clover",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/f58b0204c20ae3310f65ae7b8cb9987e.jpg",
                subOrDub: { sub: 170, dub: 170, raw: 170 } as any
            },
            {
                id: "hunter-x-hunter-2",
                title: "Hunter x Hunter",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/5567ce9631cf543666dd934005b6329e.jpg",
                subOrDub: { sub: 148, dub: 148, raw: 148 } as any
            },
            {
                id: "naruto-677",
                title: "Naruto",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/5db400c33f7494bc8ae96f9e634958d0.jpg",
                subOrDub: { sub: 220, dub: 220, raw: 220 } as any
            },
            {
                id: "demon-slayer-kimetsu-no-yaiba-swordsmith-village-arc-18056",
                title: "Demon Slayer: Kimetsu no Yaiba Swordsmith Village Arc",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/db2f3ce7b9cab7fdc160b005bffb899a.png",
                subOrDub: { sub: 11, dub: 11, raw: 11 } as any
            },
            {
                id: "boruto-naruto-next-generations-8143",
                title: "Boruto: Naruto Next Generations",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/32c83e2ad4a43229996356840db3982c.jpg",
                subOrDub: { sub: 293, dub: 293, raw: 293 } as any
            },
            {
                id: "jujutsu-kaisen-tv-534",
                title: "Jujutsu Kaisen (TV)",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/82402f796b7d84d7071ab1e03ff7747a.jpg",
                subOrDub: { sub: 24, dub: 24, raw: 24 } as any
            },
            {
                id: "solo-leveling-18718",
                title: "Solo Leveling",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/b147d331e311a5d5c8ee81269725fc92.png",
                subOrDub: { sub: 12, dub: 12, raw: 12 } as any
            },
            {
                id: "spy-x-family-17977",
                title: "Spy x Family",
                image: "https://cdn.noitatnemucod.net/thumbnail/300x400/100/3b4fb50c768e1a6be17f2231bd47dd84.jpg",
                subOrDub: { sub: 25, dub: 25, raw: 25 } as any
            }
        ];

        return Promise.resolve(topAnime);
    }
}
