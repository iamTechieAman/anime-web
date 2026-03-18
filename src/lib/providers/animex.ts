import axios from 'axios';
import { AnimeProvider, AnimeSearchResult, AnimeDetails, AnimeEpisode, VideoSource } from './types';

export class AnimexProvider implements AnimeProvider {
    name = 'animex';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get(`/api/scrape?ax_query=${encodeURIComponent(query)}`);
            return (res.data.animex || []).map((item: any) => ({
                id: `${item.id}|${item.slug}`,
                title: item.title,
                image: item.image,
                provider: 'animex'
            }));
        } catch (error) {
            console.error('[Animex] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const [realId, slug] = id.split('|');
            const res = await axios.get(`/api/scrape?ax_info=${realId}&slug=${slug}`);
            const data = res.data.ax_info;
            
            const episodes: AnimeEpisode[] = data.episodes.map((ep: any) => ({
                id: ep.id,
                number: parseFloat(ep.number),
                title: `Episode ${ep.number}`
            }));

            return {
                id: id,
                title: data.title,
                image: data.image || '/placeholder.png', 
                episodes: episodes,
                availableEpisodes: {
                    sub: episodes.length,
                    dub: 0
                },
                type: 'anime'
            };
        } catch (error: any) {
            console.error(`[Animex] GetInfo failed:`, error);
            throw new Error(`[Animex] GetInfo failed: ${error.message}`);
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw', serverId?: string): Promise<VideoSource[]> {
        try {
            const res = await axios.get(`/api/scrape?ax_source=${episodeId}`);
            const data = res.data.ax_source;
            
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
            throw new Error(`[Animex] GetSources failed: ${error.message}`);
        }
    }
}
