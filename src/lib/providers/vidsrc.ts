import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { safeString } from './parser-utils';

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
        const safeId = safeString(id);
        const ep = safeString(episodeString, '1');

        if (!safeId) return [];

        // Return multiple embed options as "Sources"
        return [
            {
                url: `https://vidsrc.me/embed/anime?mal=${safeId}&episode=${ep}`,
                quality: 'Vidsrc (Multi)',
                isM3U8: false,
                isIframe: true,
                server: 'vidsrc_me'
            },
            {
                url: `https://vidsrc.to/embed/anime/${safeId}/${ep}`,
                quality: 'Vidsrc.to',
                isM3U8: false,
                isIframe: true,
                server: 'vidsrc_to'
            },
            {
                url: `https://vidsrc.cc/v2/embed/anime/${safeId}/${ep}`,
                quality: 'Vidsrc.cc',
                isM3U8: false,
                isIframe: true,
                server: 'vidsrc_cc'
            },
            {
                url: `https://vidsrc.vip/embed/anime/${safeId}/${ep}`,
                quality: 'Vidsrc.vip',
                isM3U8: false,
                isIframe: true,
                server: 'vidsrc_vip'
            }
        ];
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> { return []; }
    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> { return []; }
}
