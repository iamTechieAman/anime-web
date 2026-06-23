import axios from 'axios';
import crypto from 'crypto';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { AllAnimeProvider } from './allanime';

const Kt = "0b39a7c3f3cd6622c1371e75e14a47b8";
const gs = "61e6b121ac2177d3bb40c53ae8b74e6e";
const bs = "4469b787c1a3d4e62ea959583608f141";
const Jt = "a4d90ffb2a80b4e5d72e5a41d9cff9d0";

const API_BASE = "https://anime.sankavollerei.web.id/api";

const va: Record<string, string> = {
    ACTION: "1", ADVENTURE: "2", CARS: "3", COMEDY: "4", DEMENTIA: "5",
    DEMONS: "6", DRAMA: "8", ECCHI: "9", FANTASY: "10", GAME: "11",
    HISTORICAL: "13", HORROR: "14", KIDS: "15", MAGIC: "16",
    MARTIAL_ARTS: "17", MECHA: "18", MUSIC: "19", PARODY: "20",
    SAMURAI: "21", ROMANCE: "22", SCHOOL: "23", SCI_FI: "24",
    SHOUJO: "25", SHOUJO_AI: "26", SHOUNEN: "27", SHOUNEN_AI: "28",
    SPACE: "29", SPORTS: "30", SUPER_POWER: "31", VAMPIRE: "32",
    HAREM: "35", SLICE_OF_LIFE: "36", SUPERNATURAL: "37", MILITARY: "38",
    POLICE: "39", PSYCHOLOGICAL: "40", THRILLER: "41", SEINEN: "42",
    JOSEI: "43", ISEKAI: "44", MYSTERY: "7"
};

function mapGenreSlug(slug: string): string {
    const normalized = slug.toUpperCase().replace(/-/g, '_');
    return va[normalized] || slug;
}

function generateHeaders(method: string, path: string): Record<string, string> {
    // Generate timestamp with slight random delay to mimic client-side timing offset
    const timestamp = (Date.now() + Math.floor(Math.random() * 10000) + 3000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    // 1. x-req-a (XOR of gs with SHA256(timestamp:nonce:Kt))
    const l = crypto.createHash('sha256').update(`${timestamp}:${nonce}:${Kt}`).digest('hex');
    let x_req_a = "";
    for (let i = 0; i < gs.length; i++) {
        x_req_a += (gs.charCodeAt(i) ^ l.charCodeAt(i % l.length)).toString(16).padStart(2, "0");
    }

    // 2. x-req-s (XOR of Jt with SHA256(timestamp:nonce:bs))
    const l_s = crypto.createHash('sha256').update(`${timestamp}:${nonce}:${bs}`).digest('hex');
    let x_req_s = "";
    for (let i = 0; i < Jt.length; i++) {
        x_req_s += (Jt.charCodeAt(i) ^ l_s.charCodeAt(i % l_s.length)).toString(16).padStart(2, "0");
    }

    // 3. x-req-g (Chained HMAC-SHA256 signature of method:path:timestamp:nonce:Jt:Kt)
    const m = `${method}:${path}:${timestamp}:${nonce}:${Jt}:${Kt}`;
    const u = crypto.createHmac('sha256', bs).update(m).digest('hex');
    const h = crypto.createHmac('sha256', Kt).update(u).digest('hex');
    const v = crypto.createHmac('sha256', gs).update(h).digest('hex');
    const x_req_g = crypto.createHmac('sha256', Jt).update(v).digest('hex');

    return {
        'referer': 'https://hianime.lol/',
        'origin': 'https://hianime.lol',
        'x-req-t': timestamp,
        'x-req-n': nonce,
        'x-req-a': x_req_a,
        'x-req-s': x_req_s,
        'x-req-g': x_req_g,
        'accept': 'application/json, text/plain, */*',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
}

async function fetchFromApi(path: string, params?: Record<string, any>): Promise<any> {
    // Strip query parameters to get the base path for header signature
    const signaturePath = `/api${path.split('?')[0]}`;
    const headers = generateHeaders("GET", signaturePath);
    const response = await axios.get(`${API_BASE}${path}`, {
        params,
        headers,
        timeout: 8000
    });
    return response.data;
}

export class HiAnimeProvider implements AnimeProvider {
    name = 'hianime';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromApi('/search', { keyword: query });
            if (!data || !data.success || !data.results || !data.results.data) return [];
            return data.results.data.map((item: any) => ({
                id: item.id || item.data_id,
                title: item.title || item.japanese_title,
                image: item.poster,
                provider: this.name
            }));
        } catch (error) {
            console.error('[HiAnime] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const infoData = await fetchFromApi('/info', { id });
            const epData = await fetchFromApi(`/episodes/${id}`);

            const results = infoData?.results?.data;
            const episodesList = epData?.results?.episodes || [];

            if (!results) throw new Error('Show info not found');

            const episodes = episodesList.map((ep: any) => ({
                id: ep.id || `${id}?ep=${ep.episode_no}`,
                number: ep.episode_no || 0,
                title: ep.title || `Episode ${ep.episode_no}`,
                image: ep.image,
                description: ep.overview,
                duration: ep.runtime,
                isFiller: ep.filler === true
            }));

            const totalEpisodes = epData?.results?.totalEpisodes || episodes.length;

            // Parse seasons if present
            const seasons = (infoData?.results?.seasons || []).map((s: any) => ({
                id: s.id || s.data_id,
                title: s.title || s.name,
                active: s.id === id
            }));

            return {
                id,
                title: results.title || results.titles?.main || results.titles?.en || id,
                image: results.poster,
                description: results.description,
                episodes,
                totalEpisodes,
                availableEpisodes: {
                    sub: results.animeInfo?.stats?.episodes?.sub || totalEpisodes,
                    dub: results.animeInfo?.stats?.episodes?.dub || 0
                },
                type: results.showType || results.animeInfo?.stats?.type || 'TV',
                status: results.animeInfo?.stats?.status || 'Releasing',
                otherNames: seasons.map((s: any) => s.title)
            };
        } catch (error) {
            console.error('[HiAnime] GetInfo failed, returning fallback metadata:', error);
            // Graceful fallback to prevent watch page load crash
            const fallbackTitle = id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const mockEpisodes = Array.from({ length: 24 }, (_, i) => ({
                id: `${id}?ep=${i + 1}`,
                number: i + 1,
                title: `Episode ${i + 1}`
            }));
            return {
                id,
                title: fallbackTitle,
                image: '/placeholder.jpg',
                description: 'Metadata retrieval from primary provider failed. Streaming remains active via fallback servers.',
                episodes: mockEpisodes,
                totalEpisodes: 24,
                availableEpisodes: { sub: 24, dub: 24 },
                type: 'TV',
                status: 'Releasing',
                otherNames: []
            };
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        try {
            console.log(`[HiAnime] Fetching sources for: ID=${id}, EpString=${episodeString}, Mode=${mode}, ServerID=${serverId}`);

            let epNumber = "1";
            if (episodeString.includes('ep=')) {
                const match = episodeString.match(/ep=(\d+)/);
                if (match) epNumber = match[1];
            } else if (/^\d+$/.test(episodeString)) {
                epNumber = episodeString;
            }

            // Fetch servers list
            const serversData = await fetchFromApi(`/servers/${id}`, { ep: epNumber });
            const serversList = serversData?.results || [];

            // Filter servers by mode (sub/dub/raw) and serverId
            let targetServers = serversList.filter((s: any) => s.type === mode);
            if (serverId) {
                targetServers = targetServers.filter((s: any) => s.server_id === serverId);
            }

            if (targetServers.length === 0) {
                // Fallback to any server matching the mode
                targetServers = serversList.filter((s: any) => s.type === mode);
            }
            if (targetServers.length === 0) {
                // Absolute fallback to all servers
                targetServers = serversList;
            }

            const sources: VideoSource[] = [];

            for (const server of targetServers) {
                try {
                    const streamData = await fetchFromApi(`/stream?id=${id}?ep=${epNumber}&server=${server.server_id}&type=${server.type}`);
                    const fileUrl = streamData?.results?.streamingLink?.link?.file;
                    const iframeUrl = streamData?.results?.streamingLink?.iframe;

                    if (fileUrl) {
                        sources.push({
                            url: fileUrl,
                            isM3U8: fileUrl.includes('.m3u8'),
                            quality: 'auto',
                            server: server.serverName || server.server_id,
                            type: server.type
                        });
                    }

                    if (iframeUrl) {
                        const proxiedEmbed = `/api/proxy/embed?url=${encodeURIComponent(iframeUrl)}&referer=${encodeURIComponent('https://hianime.lol')}`;
                        sources.push({
                            url: proxiedEmbed,
                            isM3U8: false,
                            isIframe: true,
                            quality: 'auto',
                            server: `${server.serverName || server.server_id} (Iframe)`,
                            type: server.type
                        });
                    }
                } catch (e: any) {
                    console.error(`[HiAnime] Failed to fetch stream for server ${server.server_id}:`, e.message);
                }
            }

            if (sources.length === 0) {
                throw new Error('No sources successfully extracted from API');
            }

            return sources;

        } catch (error: any) {
            console.error('[HiAnime] GetSources failed, attempting AllAnime fallback:', error.message || error);
            try {
                const allAnime = new AllAnimeProvider();
                let searchTitle = "";
                try {
                    const info = await this.getInfo(id);
                    searchTitle = info.title;
                } catch (e) {}

                if (searchTitle) {
                    console.log(`[HiAnime-Fallback] Searching AllAnime for "${searchTitle}"...`);
                    const searchRes = await allAnime.search(searchTitle);
                    if (searchRes.length > 0) {
                        return await allAnime.getSources(searchRes[0].id, episodeString, mode);
                    }
                }
            } catch (e: any) {
                console.error('[HiAnime-Fallback] AllAnime fallback failed:', e.message);
            }
            return [];
        }
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const letParam = letter.toLowerCase() === 'all' ? '' : letter.toUpperCase();
            const data = await fetchFromApi('/az-list', { letter: letParam, page });
            if (!data || !data.success || !data.results || !data.results.data) return [];
            return data.results.data.map((item: any) => ({
                id: item.id || item.data_id,
                title: item.title || item.japanese_title,
                image: item.poster,
                provider: this.name
            }));
        } catch (error) {
            console.error('[HiAnime] getAZList failed:', error);
            return [];
        }
    }

    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const genreId = mapGenreSlug(genre);
            const data = await fetchFromApi('/filter', { genres: genreId, page });
            if (!data || !data.success || !data.results || !data.results.data) return [];
            return data.results.data.map((item: any) => ({
                id: item.id || item.data_id,
                title: item.title || item.japanese_title,
                image: item.poster,
                provider: this.name
            }));
        } catch (error) {
            console.error('[HiAnime] getGenre failed:', error);
            return [];
        }
    }

    async getServers(episodeId: string): Promise<any[]> {
        try {
            // Since episodeId might be in format "id?ep=number", we parse it
            let id = episodeId;
            let epNumber = "1";
            if (episodeId.includes('?')) {
                const parts = episodeId.split('?');
                id = parts[0];
                const match = parts[1].match(/ep=(\d+)/);
                if (match) epNumber = match[1];
            }

            const serversData = await fetchFromApi(`/servers/${id}`, { ep: epNumber });
            const serversList = serversData?.results || [];

            return serversList.map((server: any) => ({
                serverName: server.serverName || server.server_id,
                serverId: server.server_id,
                type: server.type
            }));
        } catch (error) {
            console.error('[HiAnime] getServers failed:', error);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromApi('/recently-updated', { page });
            if (!data || !data.success || !data.results || !data.results.data) return [];
            return data.results.data.map((item: any) => ({
                id: item.id || item.data_id,
                title: item.title || item.japanese_title,
                image: item.poster,
                provider: this.name
            }));
        } catch (error) {
            console.error('[HiAnime] getRecent failed:', error);
            return [];
        }
    }

    async getTrending(): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromApi('');
            const list = data?.results?.trending || data?.results?.spotlights || [];
            return list.map((item: any) => ({
                id: item.id || item.data_id,
                title: item.title || item.japanese_title,
                image: item.poster,
                provider: this.name
            }));
        } catch (error) {
            console.error('[HiAnime] getTrending failed:', error);
            return [];
        }
    }

    async getCompleted(): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromApi('');
            const list = data?.results?.latestCompleted || [];
            return list.map((item: any) => ({
                id: item.id || item.data_id,
                title: item.title || item.japanese_title,
                image: item.poster,
                provider: this.name
            }));
        } catch (error) {
            console.error('[HiAnime] getCompleted failed:', error);
            return [];
        }
    }

    async getUpcoming(): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromApi('');
            const list = data?.results?.topUpcoming || [];
            return list.map((item: any) => ({
                id: item.id || item.data_id,
                title: item.title || item.japanese_title,
                image: item.poster,
                provider: this.name
            }));
        } catch (error) {
            console.error('[HiAnime] getUpcoming failed:', error);
            return [];
        }
    }
}
