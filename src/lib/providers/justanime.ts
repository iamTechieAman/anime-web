import axios from 'axios';
import { AnimeProvider, AnimeSearchResult, AnimeDetails, AnimeEpisode, VideoSource } from './types';

export class JustAnimeProvider implements AnimeProvider {
    name = 'justanime';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get(`/api/scrape?ja_query=${encodeURIComponent(query)}`);
            return (res.data.justanime || []).map((item: any) => ({
                id: `ja:${item.id}|${item.slug}`,
                title: item.title,
                image: item.image,
                provider: 'justanime'
            }));
        } catch (error) {
            console.error('[JustAnime] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const cleanId = id.startsWith('ja:') ? id.slice(3) : id;
            const [realId, slug] = cleanId.split('|');
            const res = await axios.get(`/api/scrape?ja_info=${realId}&slug=${slug}`);
            const data = res.data.ja_info;
            
            const episodes: AnimeEpisode[] = (data.episodes || []).map((ep: any) => ({
                id: ep.id,
                number: parseFloat(ep.number),
                title: `Episode ${ep.number}`
            }));

            return {
                id: id.startsWith('ja:') ? id : `ja:${id}`,
                title: data.title,
                image: data.image || '/placeholder.png', 
                episodes: episodes,
                availableEpisodesDetail: {
                    sub: episodes.map(ep => ep.number.toString()),
                    dub: []
                },
                type: 'anime'
            };
        } catch (error: any) {
            console.error(`[JustAnime] GetInfo failed:`, error);
            throw new Error(`[JustAnime] GetInfo failed: ${error.message}`);
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw', serverId?: string): Promise<VideoSource[]> {
        try {
            const res = await axios.get(`/api/scrape?ja_source=${episodeId}`);
            const data = res.data.ja_source;
            
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
            console.error(`[JustAnime] GetSources failed:`, error);
            return [];
        }
    }
}
