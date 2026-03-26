import { fetchFromScraper } from '@/lib/scraper-client';
import { AnimeProvider, AnimeSearchResult, AnimeDetails, AnimeEpisode, VideoSource } from './types';

export class AnimeSaltProvider implements AnimeProvider {
    name = 'animesalt';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromScraper({ query });
            const results = data?.animesalt || [];
            return results.map((item: any) => ({
                id: item.id.startsWith('as:') ? item.id : `as:${item.id}`,
                title: item.title,
                image: item.image,
                provider: 'animesalt',
                // Check if it's a cartoon or movie based on our internal logic if needed
                type: item.type === 'movie' ? 'movie' : 'cartoon'
            }));
        } catch (error) {
            console.error('[AnimeSalt] Search failed:', error);
            return [];
        }
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        // AnimeSalt doesn't support A-Z directly via CLI yet, but we can search for the letter
        return this.search(letter);
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const realId = id.includes(':') ? id.split(':').pop() : id;
            if (!realId) throw new Error("Invalid AnimeSalt ID");
            
            // We use the 'slug' parameter to trigger the AnimeSalt info scrape in our python script
            const res_data = await fetchFromScraper({ slug: `as:${realId}` });
            const data = res_data.as_info;
            
            if (!data || data.error) throw new Error(data?.error || "Content Not Found");

            const episodes: AnimeEpisode[] = (data.episodes || []).map((ep: any, index: number) => ({
                id: ep.id,
                number: parseFloat(ep.number) || (index + 1),
                title: ep.number ? `Episode ${ep.number}` : `Part ${index + 1}`
            }));

            return {
                id: id.startsWith('as:') ? id : `as:${data.id}`,
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
            console.error(`[Anime] GetInfo failed:`, error);
            throw new Error(`[Anime] GetInfo failed: ${error.message}`);
        }
    }

    async getSources(id: string, episodeId: string, mode: 'sub' | 'dub' | 'raw', serverId?: string): Promise<VideoSource[]> {
        try {
            // episodeId for AnimeSalt is already the full episode slug
            // Trigger open_claw_engine via the slug pattern as-ep:
            const res_data = await fetchFromScraper({ slug: `as-ep:${episodeId}` });
            const data = res_data.as_source;
            
            if (!data) return [];

            if (data.url || (data.sources && data.sources.length > 0)) {
                if (data.sources && data.sources.length > 0) {
                    return data.sources.map((s: any) => ({
                        url: s.url,
                        server: s.name || 'Anime-Alpha',
                        isM3U8: s.url.includes('.m3u8') || !!s.hls,
                        isIframe: !s.url.includes('.m3u8') && !s.url.includes('.mp4') && !s.hls,
                        quality: 'auto'
                    }));
                }
                
                return [{
                    url: data.url,
                    server: 'Anime-Speed',
                    isM3U8: data.url.includes('.m3u8'),
                    isIframe: !data.url.includes('.m3u8') && !data.url.includes('.mp4'),
                    quality: 'auto'
                }];
            }
            return [];
        } catch (error: any) {
            console.error(`[Anime] GetSources failed:`, error);
            return [];
        }
    }
}
