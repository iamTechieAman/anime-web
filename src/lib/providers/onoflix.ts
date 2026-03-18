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
      const response = await axios.get('/api/scrape', {
        params: { 
          universal_item: realId,
          universal_site: 'https://onoflix.live'
        }
      });

      const data = response.data.universal_info;

      return {
        id: id.startsWith('on:') ? id : `on:${id}`,
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
      console.error('[Onoflix] GetInfo failed:', error);
      throw error;
    }
  }

  async getSources(id: string, episodeId: string): Promise<VideoSource[]> {
    try {
      const response = await axios.get('/api/scrape', {
        params: { 
          universal_ep: episodeId,
          universal_site: 'https://onoflix.live'
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
      console.error('[Onoflix] GetSources failed:', error);
      return [];
    }
  }
}
