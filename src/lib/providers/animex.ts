import { fetchFromScraper } from '@/lib/scraper-client';
import { AnimeProvider, AnimeSearchResult, AnimeDetails, AnimeEpisode, VideoSource } from './types';

export class AnimexProvider implements AnimeProvider {
    name = 'animex';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromScraper({ ax_query: query });
            return (data.animex || []).map((item: any) => ({
                id: `ax:${item.id}|${item.slug}`,
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
            const cleanId = id.startsWith('ax:') ? id.slice(3) : id;
            const [realId, slug] = cleanId.split('|');
            const data = await fetchFromScraper({ ax_info: realId, slug });
            const ax_info = data.ax_info;
            
            const episodes: AnimeEpisode[] = (ax_info.episodes || []).map((ep: any) => ({
                id: ep.id,
                number: parseFloat(ep.number),
                title: `Episode ${ep.number}`
            }));

            return {
                id: id.startsWith('ax:') ? id : `ax:${id}`,
                title: ax_info.title,
                image: ax_info.image || '/placeholder.png', 
                episodes: episodes,
                availableEpisodesDetail: {
                    sub: episodes.map(ep => ep.number.toString()),
                    dub: []
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
            const data = await fetchFromScraper({ ax_source: episodeId });
            const ax_source = data.ax_source;
            
            if (ax_source.url || (ax_source.sources && ax_source.sources.length > 0)) {
                if (ax_source.sources && ax_source.sources.length > 0) {
                    return ax_source.sources.map((s: any) => ({
                        url: s.url,
                        name: s.name,
                        isM3U8: s.url.includes('.m3u8'),
                        isIframe: !s.url.includes('.m3u8') && !s.url.includes('.mp4'),
                        quality: 'auto'
                    }));
                }
                
                return [{
                    url: ax_source.url,
                    isM3U8: ax_source.url.includes('.m3u8'),
                    isIframe: !ax_source.url.includes('.m3u8') && !ax_source.url.includes('.mp4'),
                    quality: 'auto'
                }];
            }
            return [];
        } catch (error: any) {
            console.error(`[Animex] GetSources failed:`, error);
            return [];
        }
    }
}
