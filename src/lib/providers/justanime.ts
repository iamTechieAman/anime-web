import { fetchFromScraper } from '@/lib/scraper-client';
import { AnimeProvider, AnimeSearchResult, AnimeDetails, AnimeEpisode, VideoSource } from './types';

export class JustAnimeProvider implements AnimeProvider {
    name = 'justanime';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromScraper({ ja_query: query });
            return (data.justanime || []).map((item: any) => ({
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
            const data = await fetchFromScraper({ ja_info: realId, slug });
            const ja_info = data.ja_info;
            
            const episodes: AnimeEpisode[] = (ja_info.episodes || []).map((ep: any) => ({
                id: ep.id,
                number: parseFloat(ep.number),
                title: `Episode ${ep.number}`
            }));

            return {
                id: id.startsWith('ja:') ? id : `ja:${id}`,
                title: ja_info.title,
                image: ja_info.image || '/placeholder.png', 
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
            const data = await fetchFromScraper({ ja_source: episodeId });
            const ja_source = data.ja_source;
            
            if (ja_source.url || (ja_source.sources && ja_source.sources.length > 0)) {
                if (ja_source.sources && ja_source.sources.length > 0) {
                    return ja_source.sources.map((s: any) => ({
                        url: s.url,
                        name: s.name,
                        isM3U8: s.url.includes('.m3u8'),
                        isIframe: !s.url.includes('.m3u8') && !s.url.includes('.mp4'),
                        quality: 'auto'
                    }));
                }
                
                return [{
                    url: ja_source.url,
                    isM3U8: ja_source.url.includes('.m3u8'),
                    isIframe: !ja_source.url.includes('.m3u8') && !ja_source.url.includes('.mp4'),
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
