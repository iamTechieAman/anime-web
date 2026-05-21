import axios from 'axios';
import { decryptSource } from '@/lib/cipher';
import type { AnimeProvider, AnimeSearchResult, AnimeDetails, VideoSource } from './types';
import { getUA } from '@/lib/user-agents';
import { scrampleApiHeaders, scrampleHeaders, withRetry } from '@/lib/request-scrambler';

const ALLANIME_API = "https://api.allanime.day/api";
const ALLANIME_BASE = "https://allanime.day";
const ALLANIME_REFR = "https://allmanga.to";
const ALLANIME_CDN = "https://wp.youtube-anime.com/aln.youtube-anime.com";

// Helper function to convert thumbnail paths to full URLs
function getThumbnailUrl(thumbnail: string | null | undefined): string {
    if (!thumbnail) return '';

    // If already a full URL, return as-is
    if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
        return thumbnail;
    }

    // If it's a relative path (starts with /), prepend CDN URL
    if (thumbnail.startsWith('/')) {
        return `${ALLANIME_CDN}${thumbnail}`;
    }

    // Otherwise, construct the full path
    return `${ALLANIME_CDN}/${thumbnail}`;
}

const SEARCH_GQL = `
query($search: SearchInput, $limit: Int, $page: Int) {
    shows(search: $search, limit: $limit, page: $page) {
        edges {
            _id name englishName thumbnail availableEpisodes __typename
        }
    }
}`;

const EPISODE_LIST_GQL = `
query ($showId: String!) {
    show( _id: $showId ) {
        _id name englishName nativeName thumbnail aniListId malId availableEpisodesDetail
    }
}`;

const EPISODE_EMBED_GQL = `
query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
    episode( showId: $showId translationType: $translationType episodeString: $episodeString ) {
        episodeString sourceUrls
    }
}`;

const POPULAR_GQL = `
query($type: VaildPopularTypeEnumType, $size: Int, $dateRange: Int) {
    queryPopular(type: $type, size: $size, dateRange: $dateRange) {
        recommendations {
            anyCard {
                _id name englishName thumbnail availableEpisodes
            }
        }
    }
}`;

const RECENT_GQL = `
query($search: SearchInput, $limit: Int, $page: Int) {
    shows(search: $search, limit: $limit, page: $page) {
        edges {
            _id name englishName thumbnail availableEpisodes lastEpisodeDate
        }
    }
}`;


export class AllAnimeProvider implements AnimeProvider {
    name = 'allanime';

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const response = await withRetry(() => axios.get(ALLANIME_API, {
                params: {
                    variables: JSON.stringify({ search: { allowAdult: false, allowUnknown: false, query }, limit: 40, page: 1 }),
                    query: SEARCH_GQL
                },
                headers: scrampleApiHeaders(ALLANIME_REFR),
                timeout: 8000
            }), 3, 400);

            const shows = response.data?.data?.shows?.edges || [];
            return shows.map((show: any) => {
                // Prioritize English name, fallback to original name
                const displayName = show.englishName && show.englishName.trim() !== ''
                    ? show.englishName
                    : show.name;

                return {
                    id: show._id,
                    title: displayName,
                    image: getThumbnailUrl(show.thumbnail),
                    subOrDub: show.availableEpisodes,
                    provider: this.name
                };
            });
        } catch (error) {
            console.error('[AllAnime] Search failed:', error);
            return [];
        }
    }

    async getInfo(id: string): Promise<AnimeDetails> {
        try {
            const response = await axios.get(ALLANIME_API, {
                params: {
                    variables: JSON.stringify({ showId: id }),
                    query: EPISODE_LIST_GQL
                },
                headers: { "User-Agent": getUA(), Referer: ALLANIME_REFR },
                timeout: 10000
            });

            const show = response.data?.data?.show;
            if (!show) {
                throw new Error('Show not found');
            }

            // Convert availableEpisodesDetail to episodes array
            const episodesSub = show.availableEpisodesDetail?.sub || [];
            const episodesDub = show.availableEpisodesDetail?.dub || [];

            const episodes = episodesSub.map((ep: string) => ({
                id: ep,
                number: parseInt(ep)
            }));

            return {
                id: show._id,
                title: show.name,
                image: getThumbnailUrl(show.thumbnail),
                malId: show.malId ? parseInt(show.malId) : undefined,
                anilistId: show.aniListId ? parseInt(show.aniListId) : undefined,
                episodes,
                availableEpisodes: {
                    sub: episodesSub.length,
                    dub: episodesDub.length
                },
                availableEpisodesDetail: {
                    sub: episodesSub,
                    dub: episodesDub
                },
                totalEpisodes: Math.max(episodesSub.length, episodesDub.length)
            };
        } catch (error) {
            console.error('[AllAnime] GetInfo failed:', error);
            throw new Error(`Failed to fetch anime info: ${error}`);
        }
    }

    async getSources(id: string, episodeString: string, mode: 'sub' | 'dub' | 'raw' = 'sub'): Promise<VideoSource[]> {
        try {
            console.log(`[AllAnime] Fetching sources for: ID=${id}, Ep=${episodeString}, Mode=${mode}`);

            // Get source URLs
            const response = await axios.get(ALLANIME_API, {
                params: {
                    variables: JSON.stringify({ showId: id, translationType: mode, episodeString }),
                    query: EPISODE_EMBED_GQL
                },
                headers: { "User-Agent": getUA(), Referer: ALLANIME_REFR },
                timeout: 8000  // Reduced from 15000ms to 8000ms  
            });

            console.log(`[AllAnime] API Response status:`, response.status);
            const episodeData = response.data?.data?.episode;

            if (!episodeData) {
                console.error('[AllAnime] No episode data in response:', response.data);
                throw new Error(`Episode not found`);
            }

            if (!episodeData?.sourceUrls || episodeData.sourceUrls.length === 0) {
                console.error('[AllAnime] No sourceUrls in episode data:', episodeData);
                throw new Error(`No ${mode.toUpperCase()} sources available`);
            }

            console.log(`[AllAnime] Found ${episodeData.sourceUrls.length} sources:`, episodeData.sourceUrls.map((s: any) => s.sourceName));

            // Sort sources by priority (Default > Luf-Mp4 > S-mp4)
            const sortedSources = episodeData.sourceUrls.sort((a: any, b: any) => {
                const priority = ["Default", "Luf-Mp4", "S-mp4", "Yt-mp4"];
                const idxA = priority.indexOf(a.sourceName);
                const idxB = priority.indexOf(b.sourceName);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return 0;
            });

            // Try top 3 sources in parallel for maximum speed
            const sourcesToTry = sortedSources.slice(0, 3);
            console.log(`[AllAnime] Trying top ${sourcesToTry.length} sources in parallel...`);

            const validateSource = async (source: any): Promise<VideoSource> => {
                const rawSourceUrl = source.sourceUrl || "";
                if (!rawSourceUrl) throw new Error("Empty sourceUrl");

                const encryptedUrl = rawSourceUrl.replace(/^--/, "");
                const decryptedPath = decryptSource(encryptedUrl);
                if (!decryptedPath || decryptedPath.length < 5) throw new Error("Decryption failed");

                let finalUrl: string;
                if (decryptedPath.startsWith('http://') || decryptedPath.startsWith('https://')) {
                    finalUrl = decryptedPath;
                } else if (decryptedPath.startsWith('/')) {
                    finalUrl = `https://allanime.day${decryptedPath}`;
                } else {
                    finalUrl = `https://${decryptedPath}`;
                }

                console.log(`[AllAnime] CDN fetch: ${finalUrl.substring(0, 80)}...`);

                // Fetch stream URL with proper anime CDN headers
                const streamResponse = await axios.get(finalUrl, {
                    headers: {
                        "User-Agent": getUA(),
                        "Referer": ALLANIME_REFR,
                        "Origin": ALLANIME_REFR,
                        "Accept": "application/json, text/plain, */*",
                    },
                    timeout: 5000,
                });

                const data = streamResponse.data;

                // Try multiple known response structures from AllAnime CDN
                let videoUrl: string | null = null;

                if (typeof data === 'string' && data.startsWith('http')) {
                    // Raw URL string
                    videoUrl = data;
                } else if (Array.isArray(data) && data[0]?.link) {
                    videoUrl = data[0].link;
                } else if (Array.isArray(data) && data[0]?.url) {
                    videoUrl = data[0].url;
                } else if (data?.links?.[0]?.link) {
                    videoUrl = data.links[0].link;
                } else if (data?.links?.[0]?.url) {
                    videoUrl = data.links[0].url;
                } else if (data?.link) {
                    videoUrl = data.link;
                } else if (data?.url) {
                    videoUrl = data.url;
                } else if (data?.src) {
                    videoUrl = data.src;
                } else if (data?.file) {
                    videoUrl = data.file;
                }

                if (videoUrl && typeof videoUrl === 'string') {
                    return {
                        url: videoUrl,
                        isM3U8: videoUrl.includes('.m3u8'),
                        quality: source.sourceName,
                    };
                }

                console.warn(`[AllAnime] Unknown CDN response structure for ${source.sourceName}:`, JSON.stringify(data).substring(0, 200));
                throw new Error("No video URL found in CDN response");
            };

            try {
                // Use Promise.any to return the FIRST working source immediately
                const firstSucceeded = await Promise.any(sourcesToTry.map((s: any) => validateSource(s)));
                console.log(`[AllAnime] ✓ Fastest source found: ${firstSucceeded.quality}`);
                return [firstSucceeded];
            } catch (e: any) {
                console.log(`[AllAnime] Parallel validation failed, trying remaining sources sequentially...`);
                // Fallback to sequential for the rest if all top 3 failed
                const remainingSources = sortedSources.slice(3);
                for (const source of remainingSources) {
                    try {
                        const result = await validateSource(source);
                        return [result];
                    } catch (err) { continue; }
                }
            }

            throw new Error(`Failed to find a working source among ${sortedSources.length} options`);
        } catch (error: any) {
            console.error('[AllAnime] GetSources failed at line 161/API level:', error.message || error);
            
            // Proactive Fallback: If AllAnime sources fail, try HiAnime as a backup
            // This requires the show to have a mapping or a searchable title.
            // Since we're in the provider, we don't have the title easily unless we fetch it.
            // But usually, getSources is called with a specific ID.
            
            throw new Error(`Failed to fetch sources: ${error.message || error}`);
        }
    }

    async getPopular(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            // Using Trending search instead of queryPopular (which is unreliable)
            const response = await axios.get(ALLANIME_API, {
                params: {
                    variables: JSON.stringify({
                        search: { sortBy: "Trending" },
                        limit: 30,
                        page
                    }),
                    query: RECENT_GQL  // Reuse the working search query structure
                },
                headers: { "User-Agent": getUA(), Referer: ALLANIME_REFR },
                timeout: 10000
            });

            const shows = response.data?.data?.shows?.edges || [];
            return shows.map((show: any) => {
                const displayName = show.englishName && show.englishName.trim() !== ''
                    ? show.englishName
                    : show.name;

                return {
                    id: show._id,
                    title: displayName,
                    image: getThumbnailUrl(show.thumbnail),
                    subOrDub: show.availableEpisodes,
                    provider: this.name
                };
            });
        } catch (error) {
            console.error('[AllAnime] GetPopular failed:', error);
            return [];
        }
    }

    async getRecent(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(ALLANIME_API, {
                params: {
                    variables: JSON.stringify({
                        search: { sortBy: "Recent" },
                        limit: 30,
                        page
                    }),
                    query: RECENT_GQL
                },
                headers: { "User-Agent": getUA(), Referer: ALLANIME_REFR },
                timeout: 10000
            });

            const shows = response.data?.data?.shows?.edges || [];
            return shows.map((show: any) => {
                const displayName = show.englishName && show.englishName.trim() !== ''
                    ? show.englishName
                    : show.name;

                return {
                    id: show._id,
                    title: displayName,
                    image: getThumbnailUrl(show.thumbnail),
                    subOrDub: show.availableEpisodes,
                    provider: this.name
                };
            });
        } catch (error) {
            console.error('[AllAnime] GetRecent failed:', error);
            return [];
        }
    }
    async getTop(page: number = 1): Promise<AnimeSearchResult[]> {
        try {
            const response = await axios.get(ALLANIME_API, {
                params: {
                    variables: JSON.stringify({
                        search: { sortBy: "Popular" },
                        limit: 30,
                        page
                    }),
                    query: RECENT_GQL
                },
                headers: { "User-Agent": getUA(), Referer: ALLANIME_REFR },
                timeout: 10000
            });

            const shows = response.data?.data?.shows?.edges || [];
            return shows.map((show: any) => {
                const displayName = show.englishName && show.englishName.trim() !== ''
                    ? show.englishName
                    : show.name;

                return {
                    id: show._id,
                    title: displayName,
                    image: getThumbnailUrl(show.thumbnail),
                    subOrDub: show.availableEpisodes,
                    provider: this.name
                };
            });
        } catch (error) {
            console.error('[AllAnime] GetTop failed:', error);
            return [];
        }
    }
}
