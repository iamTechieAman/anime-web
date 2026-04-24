import { fetchFromScraper } from '../scraper-client';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

export class AniwavesProvider implements AnimeProvider {
    name = 'aniwaves';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromScraper({ anw_query: query });
            return (data.aniwaves || []).map((item: any) => ({
                id: item.id.replace('anw:', ''),
                title: item.title,
                image: item.image,
                provider: this.name
            }));
        } catch (error) {
            console.error('[Aniwaves] Search failed:', error);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromScraper({ anw_home: true });
            return (data.anw_home?.latest || []).map((item: any) => ({
                id: item.id.replace('anw:', ''),
                title: item.title,
                image: item.image,
                provider: this.name
            }));
        } catch (error) {
            console.error('[Aniwaves] getRecent failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const data = await fetchFromScraper({ anw_info: id });
            const info = data.anw_info;
            if (!info) throw new Error('No info found for ' + id);

            return {
                id: info.id,
                title: info.title,
                image: info.image || `https://aniwaves.ru/images/${id}.jpg`,
                description: info.description || "No description available.",
                episodes: (info.episodes || []).map((ep: any) => ({
                    id: ep.id,
                    number: parseInt(ep.number) || 0,
                    title: ep.title || `Episode ${ep.number}`
                })),
                totalEpisodes: info.episodes?.length || 0
            };
        } catch (error) {
            console.error('[Aniwaves] getInfo failed:', error);
            throw error;
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            const data = await fetchFromScraper({ anw_source: episodeString });
            const sources = data.anw_source?.sources || [];
            
            return sources.map((s: any) => ({
                url: s.url,
                isM3U8: s.url.includes('.m3u8'),
                quality: 'auto',
                type: 'iframe'
            }));
        } catch (error) {
            console.error('[Aniwaves] getSources failed:', error);
            return [];
        }
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromScraper({ anw_az: letter, anw_page: page });
            return (data.anw_az || []).map((item: any) => ({
                id: item.id.replace('anw:', ''),
                title: item.title,
                image: item.image,
                provider: this.name
            }));
        } catch (error) {
            console.error('[Aniwaves] getAZList failed:', error);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const data = await fetchFromScraper({ anw_home: true });
            return (data.anw_home?.trending || []).map((item: any) => ({
                id: item.id.replace('anw:', ''),
                title: item.title,
                image: item.image,
                provider: this.name
            }));
        } catch (error) {
            return [];
        }
    }

    async getTop(page: number = 1): Promise<AnimeSearchResult[]> {
        return this.getTrending(page);
    }
}
