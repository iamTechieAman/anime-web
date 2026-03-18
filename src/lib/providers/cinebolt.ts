import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

export class CineBoltProvider implements AnimeProvider {
    name = 'cinebolt';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get('/api/scrape', {
                params: { 
                    query,
                    universal_site: 'https://cinebolt.org'
                }
            });

            const data = response.data;
            const results = data.universal_search || [];

            return results.map((item: any) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                provider: 'cinebolt'
            }));
        } catch (error) {
            console.error('[CineBolt] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            // ID format: un:https://cinebolt.org:realId
            const parts = id.split(':');
            const realId = parts[parts.length - 1];

            const response = await axios.get('/api/scrape', {
                params: { 
                    universal_item: realId,
                    universal_site: 'https://cinebolt.org'
                }
            });

            const data = response.data.universal_info;

            return {
                id,
                title: data.title,
                image: data.image || '',
                description: data.description || '',
                episodes: data.episodes.map((ep: any) => ({
                    id: ep.id,
                    number: parseInt(ep.number) || 1,
                    title: `Episode ${ep.number}`
                })),
                totalEpisodes: data.episodes.length
            };
        } catch (error) {
            console.error('[CineBolt] GetInfo failed:', error);
            throw error;
        }
    }

    async getSources(id: string, episodeId: string): Promise<VideoSource[]> {
        try {
            const response = await axios.get('/api/scrape', {
                params: { 
                    universal_ep: episodeId,
                    universal_site: 'https://cinebolt.org'
                }
            });

            const data = response.data.universal_source;
            return data.sources.map((s: any) => ({
                url: s.url,
                quality: 'auto',
                isM3U8: s.url.includes('.m3u8'),
                isIframe: !s.url.includes('.m3u8') && !s.url.includes('.mp4')
            }));
        } catch (error) {
            console.error('[CineBolt] GetSources failed:', error);
            return [];
        }
    }
}
