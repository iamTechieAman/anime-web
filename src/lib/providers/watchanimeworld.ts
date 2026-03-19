import axios from 'axios';
import { AnimeProvider, AnimeSearchResult, AnimeDetails, AnimeEpisode, VideoSource } from './types';

export class WatchAnimeWorldProvider implements AnimeProvider {
    name = 'watchanimeworld';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get('/api/scrape', {
                params: { cartoon_query: query }
            });
            return (res.data || res.data.watchanimeworld || []).map((item: any) => ({
                id: item.id.startsWith('wa:') ? item.id : `wa:${item.id}`,
                title: item.title,
                image: item.image,
                provider: 'watchanimeworld',
                type: item.type === 'movie' ? 'movie' : 'cartoon'
            }));
        } catch (error) {
            console.error('[WatchAnimeWorld] Search failed:', error);
            return [];
        }
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get('/api/scrape', {
                params: { wa_az_letter: letter, wa_az_page: page }
            });
            return (res.data || []).map((item: any) => ({
                id: item.id.startsWith('wa:') ? item.id : `wa:${item.id}`,
                title: item.title,
                image: item.image,
                provider: 'watchanimeworld',
                type: item.type === 'movie' ? 'movie' : 'cartoon'
            }));
        } catch (error) {
            console.error('[WatchAnimeWorld] A-Z failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const realId = id.includes(':') ? id.split(':').pop() : id;
            const res = await axios.get('/api/scrape', {
                params: { wa_info: realId }
            });
            const data = res.data.wa_info;
            
            if (!data || data.error) throw new Error(data?.error || "Content Not Found");

            const episodes: AnimeEpisode[] = (data.episodes || []).map((ep: any, index: number) => ({
                id: ep.id,
                number: parseFloat(ep.number) || (index + 1),
                title: ep.number ? `Episode ${ep.number}` : `Part ${index + 1}`
            }));

            return {
                id: id.startsWith('wa:') ? id : `wa:${data.id}`,
                title: data.title,
                image: data.image || '/placeholder.png', 
                episodes: episodes,
                availableEpisodesDetail: {
                    sub: episodes.map(ep => ep.number.toString()),
                    dub: []
                },
                type: data.type === 'movie' ? 'movie' : 'cartoon'
            };
        } catch (error: any) {
            console.error(`[WatchAnimeWorld] GetInfo failed:`, error);
            throw new Error(`[WatchAnimeWorld] GetInfo failed: ${error.message}`);
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw', serverId?: string): Promise<VideoSource[]> {
        try {
            const res = await axios.get('/api/scrape', {
                params: { wa_source: episodeId }
            });
            const data = res.data.wa_source;
            
            if (data.url || (data.sources && data.sources.length > 0)) {
                if (data.sources && data.sources.length > 0) {
                    return data.sources.map((s: any) => ({
                        url: s.url,
                        name: s.name,
                        isM3U8: s.url.includes('.m3u8'),
                        isIframe: !s.url.includes('.m3u8') && !s.url.includes('.mp4'),
                        quality: 'auto'
                    }));
                }
                
                return [{
                    url: data.url,
                    isM3U8: data.url.includes('.m3u8'),
                    isIframe: !data.url.includes('.m3u8') && !data.url.includes('.mp4'),
                    quality: 'auto'
                }];
            }
            return [];
        } catch (error: any) {
            console.error(`[WatchAnimeWorld] GetSources failed:`, error);
            return [];
        }
    }
}
