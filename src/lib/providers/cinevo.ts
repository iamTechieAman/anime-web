import axios from 'axios';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';

const TMDB_KEY = 'a46c50a0ccb1bafe2b15665df7fad7e1';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

/**
 * CinEvo Provider — Uses TMDB API for metadata and multiple embed servers for streaming.
 * Replicates cinevo.site's architecture: TMDB search/info + 7 embed aggregator servers.
 */
export class CinEvoProvider implements AnimeProvider {
    name = 'cinevo';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get(`${TMDB_BASE}/search/multi`, {
                params: {
                    api_key: TMDB_KEY,
                    query,
                    language: 'en-US',
                    page: 1,
                    include_adult: false
                }
            });

            return (res.data.results || [])
                .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
                .slice(0, 20)
                .map((item: any) => ({
                    id: `cinevo:${item.media_type}:${item.id}`,
                    title: item.title || item.name || 'Unknown',
                    image: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : '',
                    releaseDate: item.release_date || item.first_air_date || '',
                    provider: 'cinevo',
                    subOrDub: item.media_type === 'tv' ? 'TV Show' : 'Movie'
                }));
        } catch (error) {
            console.error('[CinEvo] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            // Parse ID format: cinevo:type:tmdbId
            const parts = id.replace('cinevo:', '').split(':');
            const type = parts[0] || 'movie';
            const tmdbId = parts[1] || parts[0];

            const [detailsRes, creditsRes] = await Promise.all([
                axios.get(`${TMDB_BASE}/${type}/${tmdbId}`, {
                    params: { api_key: TMDB_KEY, language: 'en-US' }
                }),
                axios.get(`${TMDB_BASE}/${type}/${tmdbId}/credits`, {
                    params: { api_key: TMDB_KEY, language: 'en-US' }
                }).catch(() => ({ data: { cast: [], crew: [] } }))
            ]);

            const data = detailsRes.data;
            const episodes: any[] = [];

            if (type === 'tv') {
                // For TV shows, get seasons/episodes from TMDB
                const seasons = data.seasons || [];
                for (const season of seasons) {
                    if (season.season_number === 0) continue; // Skip specials
                    for (let ep = 1; ep <= season.episode_count; ep++) {
                        episodes.push({
                            id: `${tmdbId}:${season.season_number}:${ep}`,
                            number: ep,
                            title: `S${season.season_number}E${ep}`
                        });
                    }
                }
            } else {
                // Movie — single "episode"
                episodes.push({
                    id: `${tmdbId}:movie`,
                    number: 1,
                    title: data.title || 'Full Movie'
                });
            }

            return {
                id,
                title: data.title || data.name || 'Unknown',
                image: data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : '',
                description: data.overview || '',
                genres: data.genres?.map((g: any) => g.name) || [],
                totalEpisodes: episodes.length,
                episodes,
                type: type === 'tv' ? 'series' : 'movie',
                status: data.status
            };
        } catch (error) {
            console.error('[CinEvo] GetInfo failed:', error);
            throw error;
        }
    }

    async getSources(id: string, episodeId: string): Promise<VideoSource[]> {
        // Parse IDs
        const parts = id.replace('cinevo:', '').split(':');
        const type = parts[0] || 'movie';
        const tmdbId = parts[1] || parts[0];

        // Parse episode info: tmdbId:season:episode or tmdbId:movie
        const epParts = episodeId.split(':');
        const season = epParts.length >= 3 ? parseInt(epParts[1]) : 1;
        const episode = epParts.length >= 3 ? parseInt(epParts[2]) : 1;
        const isMovie = type === 'movie' || episodeId.includes(':movie');

        // Generate embed URLs for all cinevo-style servers
        const servers: VideoSource[] = [
            {
                url: isMovie
                    ? `https://vidlink.pro/movie/${tmdbId}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true`
                    : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true`,
                quality: 'VidLink Pro',
                isM3U8: false,
                isIframe: true,
                server: 'vidlink'
            },
            {
                url: isMovie
                    ? `https://player.autoembed.cc/embed/movie/${tmdbId}`
                    : `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`,
                quality: 'AutoEmbed Pro',
                isM3U8: false,
                isIframe: true,
                server: 'autoembed'
            },
            {
                url: isMovie
                    ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
                    : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
                quality: 'VidSrc',
                isM3U8: false,
                isIframe: true,
                server: 'vidsrc'
            },
            {
                url: isMovie
                    ? `https://www.2embed.cc/embed/${tmdbId}`
                    : `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
                quality: '2Embed',
                isM3U8: false,
                isIframe: true,
                server: '2embed'
            },
            {
                url: isMovie
                    ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`
                    : `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
                quality: 'MultiEmbed',
                isM3U8: false,
                isIframe: true,
                server: 'multiembed'
            },
            {
                url: isMovie
                    ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`
                    : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
                quality: 'SmashyStream',
                isM3U8: false,
                isIframe: true,
                server: 'smashy'
            },
            {
                url: isMovie
                    ? `https://www.2embed.cc/embed/${tmdbId}`
                    : `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
                quality: '2Embed',
                isM3U8: false,
                isIframe: true,
                server: '2embed'
            },
            {
                url: isMovie
                    ? `https://vidsrc.net/embed/movie/${tmdbId}`
                    : `https://vidsrc.net/embed/tv/${tmdbId}/${season}/${episode}`,
                quality: 'VidSrc.net',
                isM3U8: false,
                isIframe: true,
                server: 'vidsrc_net'
            },
            {
                url: isMovie
                    ? `https://www.cineby.gd/embed/movie?tmdb=${tmdbId}`
                    : `https://www.cineby.gd/embed/tv?tmdb=${tmdbId}&s=${season}&e=${episode}`,
                quality: 'CineBy',
                isM3U8: false,
                isIframe: true,
                server: 'cineby'
            }
        ];

        return servers;
    }

    async getPopular(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get(`${TMDB_BASE}/trending/all/week`, {
                params: { api_key: TMDB_KEY, page }
            });

            return (res.data.results || [])
                .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
                .map((item: any) => ({
                    id: `cinevo:${item.media_type}:${item.id}`,
                    title: item.title || item.name || 'Unknown',
                    image: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : '',
                    releaseDate: item.release_date || item.first_air_date || '',
                    provider: 'cinevo'
                }));
        } catch (error) {
            console.error('[CinEvo] GetPopular failed:', error);
            return [];
        }
    }

    async getTrending(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get(`${TMDB_BASE}/trending/all/day`, {
                params: { api_key: TMDB_KEY, page }
            });

            return (res.data.results || [])
                .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
                .map((item: any) => ({
                    id: `cinevo:${item.media_type}:${item.id}`,
                    title: item.title || item.name || 'Unknown',
                    image: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : '',
                    releaseDate: item.release_date || item.first_air_date || '',
                    provider: 'cinevo'
                }));
        } catch (error) {
            console.error('[CinEvo] GetTrending failed:', error);
            return [];
        }
    }

    async getGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const res = await axios.get(`${TMDB_BASE}/discover/movie`, {
                params: {
                    api_key: TMDB_KEY,
                    page,
                    with_genres: genre,
                    sort_by: 'popularity.desc',
                    language: 'en-US'
                }
            });

            return (res.data.results || []).map((item: any) => ({
                id: `cinevo:movie:${item.id}`,
                title: item.title || 'Unknown',
                image: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : '',
                releaseDate: item.release_date || '',
                provider: 'cinevo'
            }));
        } catch (error) {
            console.error('[CinEvo] GetGenre failed:', error);
            return [];
        }
    }

    async getAZList(letter: string, page: number = 1): Promise<AnimeSearchResult[]> {
        return [];
    }
}
