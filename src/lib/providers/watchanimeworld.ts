import axios from 'axios';
import { AnimeProvider, AnimeSearchResult, AnimeDetails, AnimeEpisode, VideoSource } from './types';

export class WatchAnimeWorldProvider implements AnimeProvider {
    name = 'watchanimeworld';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/scrape?cartoon_query=${encodeURIComponent(query)}`);
            return (res.data.watchanimeworld || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                type: 'cartoon'
            }));
        } catch (error) {
            console.error('[WatchAnimeWorld] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/scrape?wa_info=${id}`);
            const data = res.data.wa_info;
            
            const episodes: AnimeEpisode[] = data.episodes.map((ep: any, index: number) => ({
                id: ep.id,
                number: index + 1,
                title: `Episode ${ep.number}`
            }));

            return {
                id: data.id,
                title: data.title,
                image: '', 
                episodes: episodes,
                availableEpisodesDetail: {
                    sub: data.episodes.map((ep: any) => ep.number.toString()),
                    dub: []
                }
            };
        } catch (error: any) {
            throw new Error(`[WatchAnimeWorld] GetInfo failed: ${error.message}`);
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw', serverId?: string): Promise<VideoSource[]> {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/scrape?wa_source=${episodeId}`);
            const data = res.data.wa_source;
            
            if (data.url) {
                return [{
                    url: data.url,
                    isM3U8: false,
                    isIframe: true,
                    quality: 'auto'
                }];
            }
            return [];
        } catch (error: any) {
            throw new Error(`[WatchAnimeWorld] GetSources failed: ${error.message}`);
        }
    }
}
