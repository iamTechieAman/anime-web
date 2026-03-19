import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

export class OnoflixProvider implements AnimeProvider {
  name = 'onoflix';

  async search(query: string): Promise<AnimeSearchResult[]> {
    try {
      const response = await axios.get('/api/scrape', {
        params: { 
          query,
          universal_site: 'https://onoflix.live'
        }
      });

      const data = response.data;
      const results = data.universal_search || data.onoflix || [];

      return results.map((item: any) => ({
        id: item.id.startsWith('on:') ? item.id : `on:${item.id}`,
        title: item.title,
        image: item.image,
        provider: 'onoflix'
      }));
    } catch (error) {
      console.error('[Onoflix] Search failed:', error);
      return [];
    }
  }

  async getInfo(id: string): Promise<AnimeDetails> {
    try {
      const realId = id.includes(':') ? id.split(':').pop() : id;
      // We need to know if it's a movie or series. 
      // Most IDs from search will have the type. 
      // If not, we can try to guess or use the default.
      const isMovie = realId?.includes('/movie/');
      const cleanId = realId; // Introduce cleanId as requested
      const response = await axios.get('/api/scrape', {
        params: { 
          of_info: cleanId,
          of_type: isMovie ? 'movie' : 'series'
        }
      });

      const data = response.data.of_info;
      if (!data || data.error) throw new Error(data?.error || "Content Not Found");

      return {
        id: id.startsWith('of:') ? id : `of:${realId}`,
        title: data.title,
        image: data.image || '',
        description: data.description || '',
        episodes: data.episodes.map((ep: any) => ({
          id: ep.id,
          number: parseFloat(ep.number) || 1,
          title: ep.title || `Episode ${ep.number}`
        })),
        type: data.type === 'movie' ? 'movie' : 'series'
      };
    } catch (error) {
      console.error('[Onoflix] GetInfo failed:', error);
      throw error;
    }
  }

  async getSources(id: string, episodeId: string): Promise<VideoSource[]> {
    try {
      const isMovie = !episodeId.includes('?');
      const realId = id.includes(':') ? id.split(':').pop() : id;
      const cleanId = realId;
      const response = await axios.get('/api/scrape', {
        params: { 
          of_source: isMovie ? cleanId : episodeId,
          of_type: isMovie ? 'movie' : 'series'
        }
      });

      const data = response.data.of_source;
      if (!data || !data.sources) return [];
      
      return data.sources.map((s: any) => ({
        url: s.url,
        name: s.name || 'Server',
        quality: 'auto',
        isM3U8: s.url.includes('.m3u8'),
        isIframe: !s.url.includes('.m3u8') && !s.url.includes('.mp4')
      }));
    } catch (error) {
      console.error('[Onoflix] GetSources failed:', error);
      return [];
    }
  }
}
