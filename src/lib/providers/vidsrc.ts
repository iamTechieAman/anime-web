import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

export class VidSrcProvider implements AnimeProvider {
    name = 'vidsrc';

    // This provider is primarily for embedding, so it doesn't need to support search/info
    // It's used as a fallback for getSources when we have a MAL or AniList ID
    async search(query: string): Promise<AnimeSearchResult[]> {
        return [];
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        throw new Error('VidSrc only supports source embedding');
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub', serverId?: string): Promise<VideoSource[]> {
        console.log(`[VidSrc] Generating embed links for: ID=${id}, Ep=${episodeString}`);

        // We assume ID is a AniList or MAL ID (usually numeric for seasonal anime)
        // Many aggregators also support TMDB IDs for anime.

        const ep = episodeString;

        // Return multiple embed options as "Sources"
        return [
            {
                url: `https://vidsrc.me/embed/anime?mal=${id}&episode=${ep}`,
                quality: 'Vidsrc (Multi)',
                isM3U8: false,
                isIframe: true
            },
            {
                url: `https://vidsrc.to/embed/anime/${id}/${ep}`,
                quality: 'Vidsrc.to',
                isM3U8: false,
                isIframe: true
            },
            {
                url: `https://vidsrc.cc/v2/embed/anime/${id}/${ep}`,
                quality: 'Vidsrc.cc',
                isM3U8: false,
                isIframe: true
            },
            {
                url: `https://vidsrc.vip/embed/anime/${id}/${ep}`,
                quality: 'Vidsrc.vip',
                isM3U8: false,
                isIframe: true
            }
        ];
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> { return []; }
    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> { return []; }
}
